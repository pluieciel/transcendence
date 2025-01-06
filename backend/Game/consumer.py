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
		game = self.check_available_game()
		if (game is None):
			game = self.create_game()
		return (game)

	def get_player_current_game(self, user):
		#TODO uncomment
		#self.logger.info(f"currentGame {user.current_game_id}")
		#self.logger.info(self.games)
		#if (user.is_playing and self.games and self.games[user.current_game_id]):
		#	return (self.games[user.current_game_id])
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
		else:
			self.logger.info("Cannot create game, maximum number of concurrent games reached")

game_manager = GameManager()

class GameConsumer(AsyncWebsocketConsumer):

	@database_sync_to_async
	def save_user(self, user):
		user.save()

	async def connect(self):
		self.game = None
		self.logger = logging.getLogger('game')
		self.logger.info(f"Websocket connection made with channel name {self.channel_name}")

		query_string = self.scope["query_string"].decode()
		query_params = parse_qs(query_string)
		token = query_params.get("token", [None])[0]
		if not token:
			return
		user = await jwt_to_user(token)

		if not user:
			await self.send(text_data=json.dumps({
				"type": "handle_error",
				"message": "User not found or invalid token."
			}))
			return

		self.logger.info("Searching for a game for " + user.username)
		self.game = game_manager.get_player_current_game(user)
		if (self.game):
			self.logger.info("User found in a game, disconnecting the old session")
			channel_name = await self.game.disconnect_user(user)
			self.logger.info(channel_name)
			logging.info(self.game.game_id)
			await self.channel_layer.send(channel_name, {
			    "type": "chat.message",
			    "text": "Hello there!",
			})
			await self.channel_layer.group_discard(str(self.game.game_id), channel_name)
		else:
			self.game = game_manager.get_game(user)
		self.game.channel_layer = self.channel_layer
		self.game.assign_player(user, self.channel_name)
		user.is_playing = True
		user.current_game_id = self.game.game_id
		await self.save_user(user)
		await self.accept()

		await self.channel_layer.group_add(str(self.game.game_id), self.channel_name)

		if (self.game.is_full()):
			self.logger.info(f"Game {self.game.game_id} is full and ready to start with {self.game.player_left.user.username} and {self.game.player_right.user.username}")
			await self.send_initial_game_state(self.game)

	async def receive(self, text_data):
		logging.getLogger('game').info(text_data)
		try:
			data = json.loads(text_data)
			if data["type"] in ["keydown", "keyup"]:
				self.game.handle_key_event(
					self.channel_name,
					data["key"],
					data["type"] == "keydown"
				)
			elif data["type"] == "init_confirm":
				logging.getLogger('game').info("init confirmed")
				self.game.set_player_init(self.channel_name)

		except json.JSONDecodeError:
			print("Error decoding JSON message")
		except Exception as e:
			print(f"Error handling message: {e}")

	async def handle_error(self, event):
		self.logger.info(f"Errorr received  {event}")
		await self.send(text_data=json.dumps(event))


	async def disconnect(self, close_code):
		self.logger.info(f"WebSocket disconnected with code: {close_code}")

	async def chat_message(self, event):
		await self.send(text_data=json.dumps({"message":event["text"]}))

	async def game_update(self, event):
		await self.send(text_data=json.dumps({
			"type": "game_update",
			"data":event["data"]
		}))

	async def send_initial_game_state(self, instance):
		self.logger.info(instance.game.player_left.position)
		init_response = {
			"type": "init",
			"data": {
				"positions": {
						"player_left": vars(instance.game.player_left.position),
						"player_right": vars(instance.game.player_right.position),
						"ball": vars(instance.game.ball.position),
						"borders": {
							"top": vars(instance.game.bounds.top),
							"bottom": vars(instance.game.bounds.bottom),
							"left": vars(instance.game.bounds.left),
							"right": vars(instance.game.bounds.right),
						}
					},
					"player": {
						"left": {
							"name": instance.player_left.user.username,
							"rank": instance.player_left.user.elo,
							"score": instance.game.player_left.score
						},
						"right": {
							"name": instance.player_right.user.username,
							"rank": instance.player_right.user.elo,
							"score": instance.game.player_right.score
						}
					}
				}
			}

		    # Send the response to the group (or WebSocket connection)
		await self.channel_layer.group_send(str(instance.game_id), init_response)

	async def init(self, event):
		await self.send(text_data=json.dumps({
			"message_type": "init",
			"data": event["data"]}))
