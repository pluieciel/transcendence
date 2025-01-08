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
		self.game_history = None
		self.games = {}
		self.logger = logging.getLogger('game')

	def _get_game_history_model(self):
		if self.game_history is None:
			from api.models import GameHistory
			self.game_history = GameHistory

	async def get_game(self, user, bot):
		self._get_game_history_model()
		self.logger.info(f"Getting game for user {user.username}")
		game = None
		if (bot == 0):
			game = await self.check_available_game()
		if (game is None):
			game = await self.create_game(user, bot)
		return (game)

	def get_player_current_game(self, user):
		#TODO uncomment
		#self.logger.info(f"currentGame {user.current_game_id}")
		#self.logger.info(self.games)
		#if (user.is_playing and self.games and self.games[user.current_game_id]):
		#	return (self.games[user.current_game_id])
		return None

	async def check_available_game(self):
		games = await self.get_waiting_game()
		if (await self.is_game_exists(games)):
			return self.games[await self.get_first_game_id(games)]
		return None

	async def create_game(self, user, bot):
		game_history_model = self._get_game_history_model()
		if (bot == 0):
			game_id = await self.create_game_history(user)
		else:
			game_id = await self.create_game_history(user, game_category='AI')
		self.games[game_id] = GameBackend(game_id, bot)
		return self.games[game_id]

	@database_sync_to_async
	def get_waiting_game(self, game_category='Quick Match'):
		return self.game_history.objects.filter(game_state='waiting', game_category=game_category)

	@database_sync_to_async
	def create_game_history(self, player_a, player_b=None, game_category='Quick Match', game_mode='Vanilla'):
		return self.game_history.objects.create(player_a=player_a, player_b=player_b, game_category=game_category, game_mode=game_mode).id

	@database_sync_to_async
	def save_game_history(self, game_history):
		game_history.save()

	@database_sync_to_async
	def is_game_exists(self, games):
		return games.exists()

	@database_sync_to_async
	def get_first_game_id(self, games):
		return games.first().id

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
		self.logger.info(query_params)
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

		bot = int(query_params.get("bot", [0])[0])

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
			self.game = await game_manager.get_game(user, bot)
		self.game.channel_layer = self.channel_layer
		self.game.assign_player(user, self.channel_name)
		user.is_playing = True
		user.current_game_id = self.game.game_id
		await self.save_user(user)
		await self.accept()

		await self.channel_layer.group_add(str(self.game.game_id), self.channel_name)

		if (self.game.is_full()):
			self.logger.info("Game is ready to start,game is full")
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
