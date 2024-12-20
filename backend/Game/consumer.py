from typing_extensions import List
import channels
from channels.generic.websocket import AsyncWebsocketConsumer
from .game_logic import GameInstance  # Add this import
from .game_backend import GameBackend
from channels.layers import get_channel_layer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model, authenticate
import json
import logging
import random
from urllib.parse import parse_qs
from api.views import jwt_to_user

class GameManager:
	def __init__(self):
		self.games = {}
		self.logger = logging.getLogger('game')

	def get_game(self, user):
		self.logger.info(f"Getting game for user {user.username}")
		game = self.get_player_current_game(user)
		if (game is None):
			game = self.check_available_game()
		if (game is None):
			game = self.create_game()
		return (game)

	def get_player_current_game(self, user):
		if (user.is_playing and self.games and self.games[user.current_game_id]):
			self.logger.info("User found in a game")
			return (self.games[user.current_game_id])
		return None

	def check_available_game(self):
		if (self.games):
			for game_id, game in self.games.items():
				if (game.is_full() is False):
					self.logger.info("A game is available " + str(game_id))
					return self.games[game_id]
				else:
					self.logger.info("game id " + str(game_id) + " was full")
		return None

	def create_game(self):
		if len(self.games) == 0:
			random_id = random.randint(1, 2000)
			self.logger.info(f"No game were available, created one with id {random_id}")
			self.games[random_id] = GameBackend(random_id)
			return self.games[random_id]

		elif (len(self.games) < 1950):
			while True:
				random_id = random_number = random.randint(1, 2000)
				if random_id not in self.games:
					self.logger.info("No game were available, created one with id " + str(random_id))
					self.games[random_id] = GameBackend(random_id)
					return self.games[random_id]
					break

game_manager = GameManager()

class GameConsumer(AsyncWebsocketConsumer):

	@database_sync_to_async
	def save_user(self, user):
		user.save()

	async def connect(self):
		self.game = None
		self.logger = logging.getLogger('game')

		query_string = self.scope["query_string"].decode()
		query_params = parse_qs(query_string)
		token = query_params.get("token", [None])[0]
		if not token:
			return
		user = await jwt_to_user(token)

		if not user:
			await self.send(text_data=json.dumps({
				"type": "error",
				"message": "User not found or invalid token."
			}))
			return

		self.logger.info("Searching for a game for " + user.username)
		self.game = game_manager.get_game(user)
		self.game.assign_player(user, self.channel_name)
		await self.accept()

		if (self.game.is_full()):
			self.logger.info(f"Game {self.game.game_id} is full and ready to start with {self.game.player_left.user.username} and {self.game.player_right.user.username}")




	async def receive(self, text_data):
		try:
			data = json.loads(text_data)
			print(f"Received message: {data}")

			if data["type"] in ["keydown", "keyup"]:
				self.game.handle_key_event(
					self.channel_name,
					data["key"],
					data["type"] == "keydown"
				)

				await self.send(json.dumps({
					"type": "input_received",
					"data": {
						"key": data["key"],
						"type": data["type"]
					}
				}))
		except json.JSONDecodeError:
			print("Error decoding JSON message")
		except Exception as e:
			print(f"Error handling message: {e}")


	async def disconnect(self, close_code):
		pass




	#async def send_initial_game_state(self):
	#	init_response = {
	#		"type": "init_response",
	#		"data": {
	#			"room_id": self.game_id,
	#			"side": self.player_side,
	#			"game_started": self.game.is_full(),
	#			"positions": self.game.get_positions(),
	#			"player": self.game.get_player_data(),
	#		}
	#	}
	#	await self.send(text_data=json.dumps(init_response))
