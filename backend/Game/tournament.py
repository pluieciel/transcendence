from typing_extensions import List
from .game_backend import GameBackend
from .game_manager import GameManager
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from channels.layers import get_channel_layer
from api.db_utils import user_update_tournament
import logging
import time
import asyncio

game_manager = GameManager.get_instance()

class Tournament:
	_instance = None
	
	@classmethod
	def get_instance(cls):
		if cls._instance is None:
			cls._instance = Tournament()
			cls._instance.logger.debug("Tournament instance created")
		else:
			cls._instance.logger.debug("Tournament instance accessed")
		return cls._instance

	def __init__(self):
		if Tournament._instance is not None:
			raise Exception("This class is a singleton!")
		else:
			Tournament._instance = self
			self.size = 0
			self.players = []
			self.games = []
			self.state = "finished"
			self.mode = 'classic'
			self.logger = logging.getLogger('game')
			self.round = 1
			self.game_history = None
			self.logger.debug("Tournament initialized")
			self.winner = None
			self.tournamentStartDelay = 5
			self.startTime = None
			self.asyncioCreateTask = None

	class Player:
		def __init__(self, user, channel_name):
			self.user = user
			self.channel_name = channel_name
			self.ready = False
			self.lost = False


	class TournamentGame:
		def __init__(self, game_id, player_left, player_right, round, winner = None, state = 'waiting', surrender = False):
			self.round = round
			self.game_id = game_id
			self.player_left = player_left
			self.player_right = player_right
			self.state = state
			self.score_left = 0	
			self.score_right = 0
			self.winner = None
			self.surrender = surrender
			self.asyncioStartTask = None

	async def createTournament(self, size, mode, user, channel_name):
		if (self.state != "finished"):
			self.logger.warn(f"Tournament is not ready to be created : {self.state}")
			return False
		self.logger.info(f"Creating tournament with a size of {size}, mode {mode}, initiated by {user.username}")
		if (size not in [4,8]):
			self.logger.warn(f"Choosen size is not valid {size}")
			return False
		if (mode not in ['rumble', 'classic']):
			self.logger.warn(f"Choosen mode does not exists {mode}")
			return False
		self.mode = mode
		self.size = size
		self.state = "waiting"
		self.resetTournament()
		self.logger.info(f"Created tournament with a size of {size}, mode {mode}, initiated by {user.username}")
		await self.addPlayer(user, channel_name)
	
	def resetTournament(self):
		self.players.clear()
		self.round = 1

	def get_game_history_model(self):
		if self.game_history is None:
			self.logger.info("Importing GameHistory model")
			from api.models import GameHistory
			from Chat.consumer import ChatConsumer
			self.game_history = GameHistory
			self.chat_consumer = ChatConsumer
			self.logger.info("GameHistory model imported and set")
		return self.game_history

	async def addPlayer(self, user, channel_name):
		self.logger.info(f"Attempting to add a player in tournament : {user.username}")
		if (self.state != 'waiting'):
			self.logger.warn(f"Tournament is not ready to be joined : {self.state}")
			return False
		for player in self.players:
			if player.user.id == user.id:
				self.logger.info("Player was already inside the list of players")
				return False
		self.players.append(self.Player(user, channel_name))
		await user_update_tournament(user, True)
		self.logger.warn(f"User {user.username} appended to the list of players")
		if (len(self.players) == self.size):
			self.logger.warn(f"Player count reached the size of the tournament, starting tournament")
			await self.startTournament()
		self.logger.info("Player added")
		await self.send_tournament_update()
		return True
	
	def isPlayer(self, user, channel_name):
		for player in self.players:
			if player.user == user and player.lost is False:
				player.channel_name = channel_name
				return True
		return False
	
	async def removePlayer(self, user):
		self.logger.warn(f"Attempting to remove the player {user.username}")
		for player in self.players:
			if player.user == user:
				if (self.state == 'waiting'):
					self.players.remove(player)
					await user_update_tournament(user, False)
					self.logger.warn(f"Tournament was in waiting state, removing player")
					if len(self.players) == 0:
						self.state = 'finished'
						self.logger.warn(f"Player count reached 0, finishing the tournament")
				elif (self.state == 'starting'):
					self.players.remove(player)
					await user_update_tournament(user, False)
					self.asyncioCreateTask.cancel()
					self.state = 'waiting'
					self.logger.warn(f"Tournament was starting, removing the player and canceling tournament start")
				elif self.state == 'playing':
					self.logger.info("Tournament was playing, calling give up player")
					await self.giveUp(player)
				else:
					self.logger.info("Tournament is in unknown state")
				return True
		await self.send_tournament_update()	
		return False
	
	async def giveUp(self, player):
		for game in self.games:
			if game.player_left == player or game.player_right == player:
				if game.state == 'playing':
					self.logger.info(f"Player gave up while playing, disconnecting player from game {game.game_id}")
					await game_manager.games[game.game_id].player_disc(player.user)
					await self.send_tournament_update()
					await user_update_tournament(player.user, False)
				elif game.state == 'waiting':
					self.logger.info(f"Game didnt start yet calling game ended")
					await self.gameEnded(game.game_id, 0, 0, game.player_left if game.player_right == player else game.player_right)
					del game_manager.games[game.game_id]
					self.logger.info(f"Game {game.game_id} deleted")
					game.game_id = -1
					await self.send_tournament_update()

	async def startTournament(self):
		await self.send_tournament_update()
		self.state = 'starting'
		self.startTime = time.time() + self.tournamentStartDelay 
		self.logger.info(f"Tournament starting at time : {self.startTime}")
		self.asyncioCreateTask = asyncio.create_task(self.delayTournament())
		await self.send_tournament_update()

	async def delayTournament(self):
		await asyncio.sleep(self.tournamentStartDelay)
		await self.beginTournament()

	
	async def beginTournament(self):
		self.logger.info("Tournament delay is up, creating games and starting the tournament")
		self.state = 'playing'
		self.games.clear()
		self.winner = None
		self.logger.info("Creating games")
		await self.createGames()
		await self.checkForNextRound()
		self.logger.info("Tournament started")

	async def send_tournament_update(self, message):
		channel_layer = get_channel_layer()
		# Send the message to a specific group or channel
		await channel_layer.group_send(
			"tournament_updates",  # This should be the group name that clients are subscribed to
			{
				"type": "tournament_update",  # This is the event type that the consumer will handle
				"message": message,
			}
		)
	


	async def createGames(self):
		for i in range(0, int(self.size / self.round), 2):
			self.logger.info(f"Creating games for round {self.round} : {i} - {i+1}")
			await self.createGame(self.players[i], self.players[i+1], self.round, self.mode)
	
	async def create_next_round_games(self, winners):
		self.logger.info(f"Creating games for round {self.round}")
		self.logger.info(f"Winners are {winners}")
		for i in range(0, len(winners), 2):
			await self.createGame(winners[i], winners[i+1], self.round, self.mode)
		
	async def createGame(self, player_left, player_right, round, mode):
		self.logger.info(f"Creating game between {player_left.user.username} and {player_right.user.username} for round {round}")
		if player_left.lost is False and player_right.lost is False:
			self.logger.info("Both players are available")
			self.game_history = self.get_game_history_model()
			self.logger.info("Creating game history")
			game_id = (await self.create_game_history(player_left=player_left.user, player_right=player_right.user, game_mode=mode, game_type='tournament')).id
			game = GameBackend(game_id, 0, game_manager, False, mode, True)
			game_manager.games[game_id] = game
			tournamentGame = self.TournamentGame(game_id, player_left, player_right, round)
			self.logger.info(f"Game {game_id} created between {player_left.user.username} and {player_right.user.username}")
		else:
			self.logger.info("One or both players have lost")
			if player_left.lost and player_right.lost:
				winner = player_left
				await self.channel_layer.group_discard("players", player_right.channel_name)
			elif player_left.lost:
				winner = player_right
				await self.channel_layer.group_discard("players", player_left.channel_name)
			elif player_right.lost:
				winner = player_left
				await self.channel_layer.group_discard("players", player_right.channel_name)
			tournamentGame = self.TournamentGame(-1, player_left, player_right, round, winner=winner, state='finished', surrender=True)
			await self.gameEnded(-1, 0, 0, winner)
			self.logger.info(f"Game created between {player_left.user.username} and {player_right.user.username} but one of them gave up")
		self.games.append(tournamentGame)
		self.logger.info(f"Game appended to tournament games list")
		await self.send_tournament_update()

	def get_winners_of_round(self, round):
		winners = []
		for game in self.games:
			if game.round == round and game.state == 'finished':
				self.logger.info(f"Game winner for {game.game_id} was {game.winner.user.username}")
				winners.append(game.winner)
		return winners
	
	async def checkForNextRound(self):
		self.logger.info("Checking for next round")
		current_round = self.round
		winners = self.get_winners_of_round(current_round)
		
		if len(winners) == self.size // (2 ** current_round):
			self.logger.info(f"All games of round {current_round} are finished")
			if len(winners) == 1:
				self.state = 'finished'
				self.winner = winners[0]
				self.logger.info(f"Tournament finished, winner is {winners[0].user.username}")
			else:
				self.round += 1
				self.logger.info(f"Starting round {self.round}")
				await self.create_next_round_games(winners)
		else:
			self.logger.info(f"Not all games of round {current_round} are finished yet")
		await self.send_tournament_update()

	
	@database_sync_to_async
	def create_game_history(self, player_left, player_right=None, game_type='ranked', game_mode='classic', game_state='waiting', tournament_count=0, tournament_round2_game_id=-1, tournament_round2_place=-1):
		try:
			return self.game_history.objects.create(
				player_left=player_left, 
				player_right=player_right, 
				game_type=game_type, 
				game_mode=game_mode, 
				game_state=game_state, 
				tournament_count=tournament_count, 
				tournament_round2_game_id=tournament_round2_game_id, 
				tournament_round2_place=tournament_round2_place
			)
		except Exception as e:
			self.logger.error(f"Error in create_game_history: {e}")
			raise
	
	async def gameEnded(self, game_id, scoreLeft, scoreRight, winner):
		self.logger.info(f"Game {game_id} ended")
		for game in self.games:
			if game.game_id == game_id:
				self.logger.info(f"Game {game_id} found")
				game.state = 'finished'
				game.score_left = scoreLeft
				game.score_right = scoreRight
				game.winner = winner
				game.player_left.ready = False
				game.player_right.ready = False
				if winner == game.player_left.user:
					game.player_right.lost = True
					game.player_left.lost = False
					game.winner = game.player_left
					self.logger.info(f"Winner is player left, {game.player_right.user.username} lost, {game.player_left.user.username} wins")
				elif winner == game.player_right.user:
					game.player_left.lost = True
					game.player_right.lost = False
					game.winner = game.player_right
					self.logger.info(f"Winner is player right, {game.player_left.user.username} lost, {game.player_right.user.username} wins")
				else:
					self.logger.info('Game ended no winenr match')
				self.logger.info(f"Game {game_id} ended with {game.score_left} - {game.score_right}, the winner is {winner}")
				await self.checkForNextRound()
				return
				
	
	async def setReady(self, user):
		self.logger.info("Received ready")
		for game in self.games:
			if (game.state != 'waiting'):
				self.logger.info(f"Game {game.game_id} is not waiting cannot set ready")
				continue
			self.logger.info(f"Checking game {game.game_id}")
			self.logger.info(f"PLeft game {game.player_left.user.username}")
			self.logger.info(f"PRight game {game.player_right.user.username}")
			if game.player_left.user == user and game.player_left.lost is False:
				game.player_left.ready = True
				self.logger.info("Player left set ready")
			elif game.player_right.user == user and game.player_right.lost is False:
				game.player_right.ready = True
				self.logger.info("Player right set ready")
			if game.player_left.ready and game.player_right.ready:
				game.state = 'playing'
				await self.sendStartGame(game)
		if (len(self.games) == 0):
			self.logger.warn("No games found")
		await self.send_tournament_update()

	async def sendStartGame(self, game):
		self.logger.info("Sending start game")
		channel_layer = get_channel_layer()
		await channel_layer.send(game.player_left.channel_name, {
			"type": "start_game",
		})
		await channel_layer.send(game.player_right.channel_name, {
			"type": "start_game",
		})
		self.logger.info(f"Game {game.game_id} started between {game.player_left.user.username} and {game.player_right.user.username}")


	def getUserAvatar(self, user):
		if (user.avatar_42):
			return user.avatar_42
		elif (user.avatar):
			return user.avatar.url
		else:
			return '/imgs/default_avatar.png'
	
	def getUserName(self, user):
		if (user.display_name):
			return user.display_name
		else:
			return user.username
		
	async def send_tournament_update(self):
		if (self.winner and self.winner.user):
			winner = self.getUserName(self.winner.user)
		else:
			winner = None
		tournament_state = {
			"type": "tournament_update",
			"state": self.state,
			"size": self.size,
			"mode": self.mode,
			"round": self.round,
			"start_time": self.startTime,
			"winner" : winner,
			"players": [
				{
					"username": player.user.username,
					"display": player.user.display_name,
					"avatar": self.getUserName(player.user),
					"ready": player.ready,
					"lost": player.lost,
				} for player in self.players
			],
			"games": [
				{
					"player_left": {
						"user": {
							"username": game.player_left.user.username,
							"displayName" : game.player_left.user.display_name,
							"avatar" : self.getAvatar(game.player_left.user)
						},
						"ready": game.player_left.ready,
						"lost": game.player_left.lost,
						"score": game.score_left
					},
					"player_right": {
						"user": {
							"username": game.player_right.user.username,
							"displayName" : game.player_right.user.display_name,
							"avatar" : self.getAvatar(game.player_right.user)
						},
						"ready": game.player_right.ready,
						"lost": game.player_right.lost,
						"score": game.score_right
					},
					"round": game.round,
					"state": game.state,
					"winner": game.winner.user.username if game.winner else None,
					"game_id" : game.game_id
				} for game in self.games
			]
		}

		self.channel_layer = get_channel_layer()
		self.logger.info("Sending updates")
		await self.channel_layer.group_send(
			"updates",
			{
				"type": "send_tournament_update",
				"message": tournament_state
			}
		)