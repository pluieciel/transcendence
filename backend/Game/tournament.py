from typing_extensions import List
from .game_backend import GameBackend
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
import logging
from time import sleep

class Tournament:
	_instance = None
	
	@classmethod
	def get_instance(cls):
		if cls._instance is None:
			cls._instance = Tournament()
		return cls._instance

	def __init__(self):
		if Tournament._instance is not None:
			raise Exception("This class is a singleton!")
		else:
			Tournament._instance = self
			self.groups = ["updates"]
			self.size = 0;
			self.players = []
			self.games = []
			self.state = "finished"
			self.mode = 'classic'
			self.logger = logging.getLogger('game')
			self.round = 1


	async def createTournament(self, size, mode, user):
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
		await self.addPlayer(user)

	async def addPlayer(self, user):
		if (self.state != 'waiting'):
			self.logger.warn(f"Tournament is not ready to be joined : {self.state}")
			return False
		self.logger.info("Appending an user to players")
		self.players.append(user)
		if (len(self.players) == self.size):
			self.startTournament()
		self.logger.info("Player added")
		#await self.channel_layer.group_add("players", self.channel_name)
	
	async def removePlayer(self, user):
		if (user in self.players):
			self.players.remove(user)
			if (len(self.players) == 0):
				self.state = 'finished'
		#If is a player, forfeit it
	
	def startTournament(self):
		self.state = 'playing'
		pass

	def createGames():
		pass