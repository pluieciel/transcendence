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
from .tournament import Tournament


tournament = Tournament.get_instance()

class TournamentConsumer(AsyncWebsocketConsumer):
	def __init__(self):
		super().__init__()
		self.groups = ["updates"]
		self.logger = logging.getLogger('game')
		self.user = None

	async def connect(self):
		self.logger.info("connected to ws")
		user = await jwt_to_user(self.scope['headers'])
		self.user = user
		if not self.user:
			await self.send(text_data=json.dumps({
				"type": "handle_error",
				"message": "Invalid JWT"
			}))
			return
		await self.accept()
		await self.channel_layer.group_add("updates", self.channel_name)
		await self.sendUpdates()
		#Recognize if the user is a player
	async def receive(self, text_data):
		try:
			data = json.loads(text_data)
			if data["action"] == 'create':	
				size = int(data['size'])
				mode = data['mode']
				self.logger.info(self.user)
				self.logger.info(f"Size {size}, Mode {mode}")
				await tournament.createTournament(size, mode, self.user)
			elif data["action"] == 'join':
				self.logger.info("Joining tournament")
				await tournament.addPlayer(self.user)
			elif data["action"] == 'leave':
				self.logger.info("Leaving tournament")
				await tournament.removePlayer(self.user)
			elif data["action"] == 'spectate':
				pass
			elif data["action"] == 'ready':
				pass
			await self.sendUpdates()


		except json.JSONDecodeError:
			print("Error decoding JSON message")
		except Exception as e:
			print(f"Error handling message: {e}")

	async def disconnect(self, close_code):
		pass

	#Send visual updates
	#Receive players joining tournament
	#Receive player leaving tournament
	#Receive tournamnent creation


	#Send start game to players
	#Receive ready state for tournament
	#Receive spectate game




	async def sendUpdates(self):
		tournament_state = {
			"type": "tournament_update",
			"state": tournament.state,
			"size": tournament.size,
			"mode": tournament.mode,
			"round": tournament.round,
			"players": [
				{
					"username": player.username
				} for player in tournament.players
			]
		}
		self.logger.info("Sending updates")
		await self.channel_layer.group_send(
			"updates",
			{
				"type": "send_tournament_update",
				"message": tournament_state
			}
		)

	async def send_tournament_update(self, event):
		await self.send(text_data=json.dumps(event["message"]))




	