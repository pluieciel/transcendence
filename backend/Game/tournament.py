from typing_extensions import List
from .game_backend import GameBackend
from .game_manager import GameManager
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from channels.layers import get_channel_layer
import logging
from time import sleep

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

	async def createTournament(self, size, mode, user, channel_name):
		self.logger.info("Enter create tournament")
		if (size not in [4,8]):
			self.logger.warn(f"Choosen size is not valid {size}")
			return False
		if (mode not in ['rumble', 'classic']):
			self.logger.warn(f"Choosen mode does not exists {mode}")
			return False
		if (self.state != "finished"):
			self.logger.warn(f"Tournament is not ready to be created : {self.state}")
			return False
		self.mode = mode
		self.size = size
		self.state = "waiting"
		self.round = 1
		self.logger.info("Created tournament")
		await self.addPlayer(user, channel_name)

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
		if (self.state != 'waiting'):
			self.logger.warn(f"Tournament is not ready to be joined : {self.state}")
			return False
		self.logger.info("Appending an user to players")
		self.players.append(self.Player(user, channel_name))
		if (len(self.players) == self.size):
			await self.startTournament()
		self.logger.info("Player added")
		return True
	
	async def removePlayer(self, user):
		for player in self.players:
			if player.user == user:
				self.players.remove(player)
				if len(self.players) == 0:
					self.state = 'finished'
				return True
		return False

	#If is a player, forfeit it

	async def startTournament(self):
		self.state = 'playing'
		self.logger.info("Creating games")
		await self.createGames()
		#Check for the next round (in case many player gave up)
		await self.checkForNextRound()
		self.logger.info("Tournament started")

	async def createGames(self):
		self.logger.info(f"Looping games for {int(self.size / self.round)}")
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
			self.logger.info(f"Game {game_id} created in history between {player_left.user.username} and {player_right.user.username}")
			game = GameBackend(game_id, 0, game_manager, False, mode, True)
			self.logger.info(f"Game {game_id} created in backend between {player_left.user.username} and {player_right.user.username}")
			game_manager.games[game_id] = game
			self.logger.info(f"Game {game_id} assigned in manager between {player_left.user.username} and {player_right.user.username}")
			tournamentGame = self.TournamentGame(game_id, player_left, player_right, round)
			self.logger.info(f"Game {game_id} created between {player_left.user.username} and {player_right.user.username}")
		else:
			self.logger.info("One or both players have lost")
			if player_left.lost and player_right.lost:
				winner = player_left
			elif player_left.lost:
				winner = player_right
			elif player_right.lost:
				winner = player_left
			tournamentGame = self.TournamentGame(-1, player_left, player_right, round, winner=winner, state='finished', surrender=True)
			self.logger.info(f"Game created between {player_left.user.username} and {player_right.user.username} but one of them gave up")
		self.games.append(tournamentGame)
		self.logger.info(f"Game appended to tournament games list")

	def get_winners_of_round(self, round):
		winners = []
		for game in self.games:
			if game.round == round and game.state == 'finished':
				winners.append(game.winner)
		return winners
	
	async def checkForNextRound(self):
		self.logger.info("Checking for next round")
		current_round = self.round
		winners = self.get_winners_of_round(current_round)
		
		if len(winners) == self.size // (2 ** current_round):
			self.logger.info(f"All games of round {current_round} are finished")
			if len(winners) == 1:
				self.logger.info(f"Tournament finished, winner is {winners[0].user.username}")
				self.state = 'finished'
				self.winner = winners[0]
			else:
				self.round += 1
				self.logger.info(f"Starting round {self.round}")
				await self.create_next_round_games(winners)
		else:
			self.logger.info(f"Not all games of round {current_round} are finished yet")

	
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
				if winner == game.player_left:
					game.player_right.lost = True
					game.winner = game.player_left
				else:
					game.player_left.lost = True
					game.winner = game.player_right
				self.logger.info(f"Game {game_id} ended with {game.score_left} - {game.score_right}")
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
			if game.player_left.user == user:
				game.player_left.ready = True
				self.logger.info("Player left set ready")
			elif game.player_right.user == user:
				game.player_right.ready = True
				self.logger.info("Player right set ready")
			if game.player_left.ready and game.player_right.ready:
				game.state = 'playing'
				await self.sendStartGame(game)
		if (len(self.games) == 0):
			self.logger.warn("No games found")

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

