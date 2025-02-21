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
			
	class Player:
		def __init__(self, user, channel_name):
			self.user = user
			self.channel_name = channel_name
			self.ready = False

	class TournamentGame:
		def __init__(self, game_id, player_left, player_right):
			self.game_id = game_id
			self.player_left = player_left
			self.player_right = player_right
			self.state = 'waiting'
			self.score_left = 0	
			self.score_right = 0
			self.winner = None

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
		self.logger.info("Tournament started")

	async def createGames(self):
		self.game_history = self.get_game_history_model()
		game_id = (await self.create_game_history(player_left=self.players[0].user, player_right=self.players[1].user, game_mode=self.mode, game_type='tournament')).id
		game_manager.games[game_id] = GameBackend(game_id, 0, game_manager, False, self.mode, True)
		tournamentGame = self.TournamentGame(game_id, self.players[0], self.players[1])
		self.games.append(tournamentGame)

		game_id = (await self.create_game_history(player_left=self.players[2].user, player_right=self.players[3].user, game_mode=self.mode, game_type='tournament')).id
		game_manager.games[game_id] = GameBackend(game_id, 0, game_manager, False, self.mode, True)
		tournamentGame = self.TournamentGame(game_id, self.players[2], self.players[3])
		self.games.append(tournamentGame)
		self.logger.info(f"Game {game_id} created between {self.players[2].user.username} and {self.players[3].user.username}")
	
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
				self.logger.info(f"Game {game_id} ended with {game.score_left} - {game.score_right}")
				
	
	async def setReady(self, user):
		self.logger.info("Received ready")
		for game in self.games:
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
				self.logger.info("Both player set ready")
				# Use the channel game of both users to send them a message to start the game
				channel_layer = get_channel_layer()
				await channel_layer.send(game.player_left.channel_name, {
					"type": "start_game",
				})
				await channel_layer.send(game.player_right.channel_name, {
					"type": "start_game",
				})
				self.logger.info(f"Game {game.game_id} started between {game.player_left.user.username} and {game.player_right.user.username}")
