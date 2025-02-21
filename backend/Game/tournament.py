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
from urllib.parse import parse_qs
from channels.layers import get_channel_layer
from copy import deepcopy
from api.utils import jwt_to_user

class TournamentConsumer(AsyncWebsocketConsumer):
	def __init__(self):
		self.size = 0;
		self.players = []
		self.games = []
		self.state = "finished"
		self.mode = 'classic'
		self.logger = logging.getLogger('game')
		self.round = 1
		self.user = None

	async def connect(self):
		user = await jwt_to_user(self.scope['headers'])
		self.user = user
		if not self.user:
			await self.send(text_data=json.dumps({
				"type": "handle_error",
				"message": "Invalid JWT"
			}))
			return
		await self.channel_layer.group_add("updates", self.channel_name)
		#Recognize if the user is a player
	async def receive(self, text_data):
		try:
			data = json.loads(text_data)
			if data["action"] == 'create':
				self.logger.info(f"Size {data['size']},  {type(data['size'])} Mode {data['mode']}, {type(data['mode'])}")
				self.createTournament(data['size'], data['mode'], self.user)
			elif data["action"] == 'join':
				self.logger.info("Joining tournament")
				self.addPlayer(self.user)
			elif data["action"] == 'leave':
				self.logger.info("Leaving tournament")
				self.removePlayer(self.user)
			elif data["action"] == 'spectate':
				pass
			elif data["action"] == 'ready':
				pass
			await self.sendUpdates()


		except json.JSONDecodeError:
			print("Error decoding JSON message")
		except Exception as e:
			print(f"Error handling message: {e}")

	async def disconnect(self):
		pass

	#Send visual updates
	#Receive players joining tournament
	#Receive player leaving tournament
	#Receive tournamnent creation


	#Send start game to players
	#Receive ready state for tournament
	#Receive spectate game


	async def createTournament(self, size, mode, user):
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
		self.addPlayer(user)

	async def addPlayer(self, user):
		if (self.state != 'waiting'):
			self.logger.warn(f"Tournament is not ready to be joined : {self.state}")
			return False
		self.players.append(user)
		if (self.players.count == self.size):
			self.startTournament()
		await self.channel_layer.group_add("players", self.channel_name)
	
	async def removePlayer(self, user):
		if (user in self.players):
			self.players.remove(user)
			if (self.players.count == 0):
				self.state = 'finished'
		#If is a player, forfeit it
	
	def startTournament():
		#Reset games
		pass

	def createGames():
		pass

	async def sendUpdates(self):
		tournament_state = {
			"type": "tournament_update",
			"state": self.state,
			"size": self.size,
			"mode": self.mode,
			"round": self.round,
			"players": [
				{
					"username": player.username
				} for player in self.players
			]
		}
		
		await self.channel_layer.group_send(
			"updates",
			{
				"type": "send_tournament_update",
				"message": tournament_state
			}
		)

	async def send_tournament_update(self, event):
		await self.send(text_data=json.dumps(event["message"]))




	