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

active_connections = {}
tournament = Tournament.get_instance()

class TournamentConsumer(AsyncWebsocketConsumer):
	def __init__(self):
		super().__init__
		self.logger = logging.getLogger('game')
		self.user = None
		self.groups = ['updates', 'players']

	async def connect(self):
		self.logger.info("Connected to tournament websocket")

		user = await jwt_to_user(self.scope['headers'])
		self.user = user
		if not self.user:
			await self.accept()
			await self.send(text_data=json.dumps({
				"type": "handle_error",
				"message": "Invalid JWT"
			}))
			await self.close()
			return
		if (user.id in active_connections):
			await active_connections[user.id].close()
		
		await self.accept()
		self.logger.info(f"User {user.username} accepted in tournament websocket")
		active_connections[user.id] = self
		await self.channel_layer.group_add("updates", self.channel_name)
		if (tournament.isPlayer(self.user, self.channel_name)):
			self.logger.info("New connection was already a player, adding to player channel")
			await self.channel_layer.group_add("players", self.channel_name)
			self.logger.info(f"User {user.username} added in the player group")
		await tournament.send_tournament_update()
		self.logger.info(f"Tournament update sent in consumer")

	async def receive(self, text_data):
		try:
			data = json.loads(text_data)
			if data["action"] == 'create':	
				size = int(data['size'])
				mode = data['mode']
				self.logger.info("Create action received, calling createTournament")
				await tournament.createTournament(size, mode, self.user, self.channel_name)
			elif data["action"] == 'join':
				self.logger.info("Join action received, calling addPlayer")
				if (await tournament.addPlayer(self.user, self.channel_name)):
					await self.channel_layer.group_add("players", self.channel_name)	
			elif data["action"] == 'leave':
				self.logger.info("Leave action received, calling removePlayer")
				if (await tournament.removePlayer(self.user)):
					await self.channel_layer.group_discard("players", self.channel_name)
			elif data["action"] == 'spectate':
				self.logger.info("Spectate action received, calling spectate")
				pass
			elif data["action"] == 'ready':
				self.logger.info("Ready action received, calling setReady")
				await tournament.setReady(self.user)


		except json.JSONDecodeError:
			print("Error decoding JSON message")
		except Exception as e:
			print(f"Error handling message: {e}")

	async def disconnect(self, close_code):
		self.logger.info("Disconnected from tournament websocket")
		if self.user.id in active_connections:
			del active_connections[self.user.id]


	async def tournament_update(self, event):
		message = event["message"]
		await self.send(text_data=json.dumps({
            "type": "tournament_update",
            "message": message,
        }))

	async def send_tournament_update(self, event):
		await self.send(text_data=json.dumps(event["message"]))

	async def start_game(self, event):
		await self.send(text_data=json.dumps({
			"type": "start_game"
		}))




