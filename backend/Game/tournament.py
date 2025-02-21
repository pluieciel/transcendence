import asyncio
import time
import logging
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from .normal_game_logic import ClassicGameInstance, GameBounds
from .rumble_game_logic import RumbleGameInstance, GameBounds
from channels.db import database_sync_to_async
from .bot import Bot
from api.db_utils import finish_game_history, user_update_game, delete_game_history, get_user_preference, get_user_statistic, unlock_achievement, update_achievement_progression, update_game_history_player_right
from datetime import datetime
import redis
import math
from channels.layers import get_channel_layer
from copy import deepcopy

class TournamentConsumer(AsyncWebsocketConsumer):
	def __init__(self):
		self.size = 0;
		self.players = []
		self.games = []
		self.state = "finished"
		self.mode = 'classic'
		self.logger = logging.getLogger('game')
		self.round = 1

	async def connect(self):
		pass
	async def receive(self):
		pass
	async def disconnect(self):
		pass

	#Send visual updates
	#Receive players joining tournament
	#Receive player leaving tournament
	#Send start game to players
	#Receive ready state for tournament
	#Receive spectate game
	#Receive tournamnent creation

	def createTournament(self, size, mode, user):
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
		self.round = 1
		self.state = "waiting"
		self.addPlayer(user)

	def addPlayer(self, user):
		if (self.state != 'waiting'):
			self.logger.warn(f"Tournament is not ready to be joined : {self.state}")
			return False
		self.players.append(user)
		#Connect to websocket
		if (self.players.count == self.size * 2):
			self.startTournament()
	
	def removePlayer(self, user):
		if (user in self.players):
			self.players.remove(user)
			if (self.players.count == 0):
				#Disconnect from websocket 
				#Discard the tournament
				pass
	
	def startTournament():
		#Reset games
		pass

	def createGames():
		pass

	async def sendUpdates():
		pass




	