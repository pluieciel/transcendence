from typing_extensions import List
import channels
from channels.generic.websocket import AsyncWebsocketConsumer
from .game_backend import GameBackend
from channels.layers import get_channel_layer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
import json
import logging
from urllib.parse import parse_qs
from api.utils import jwt_to_user
from api.db_utils import get_user_preference
from channels.layers import get_channel_layer
from datetime import datetime
from time import sleep
from api.db_utils import user_update_game, delete_game_history, get_user_statistic, get_user_by_name
from .game_manager import GameManager

active_connections = {}
game_manager = GameManager.get_instance()

class GameConsumer(AsyncWebsocketConsumer):


	async def connect(self):
		from api.models import is_valid_invite
		self.is_valid_invite = is_valid_invite
		self.game = None
		self.spectator = False
		self.logger = logging.getLogger('game')
		self.logger.info(f"Websocket connection made with channel name {self.channel_name}")
		query_string = self.scope["query_string"].decode()
		query_params = parse_qs(query_string)
		watchId = query_params.get("watchId", [None])[0]
		watch = query_params.get("watch", [None])[0]

		user = await jwt_to_user(self.scope['headers'])
		self.user = user
		if not self.user:
			await self.accept()
			self.logger.error("GameConsumer : Invalid JWT")
			await self.send(text_data=json.dumps({
				"type": "handle_error",
				"message": "Invalid JWT"
			}))
			await self.close()
			return
		if (user.playing):
			await self.accept()
			self.logger.error(f"GameConsumer : User {user.username} already in a game")
			await self.send(text_data=json.dumps({
					"type": "handle_error",
					"message": "Player is already in a game"
			}))
			await self.close()
			return
		game_manager._get_game_history_model()
		if (user.tournament and not watch and not watchId):
			tournament_game_id = await game_manager.tournament_player(self.user)
			if not tournament_game_id:
				await self.accept()
				self.logger.error(f"GameConsumer : User {user.username} already in a tournament")
				await self.send(text_data=json.dumps({
						"type": "handle_error",
						"message": "Player is registered in a tournament"
				}))
				await self.close()
				return
		if (user.id in active_connections):
			await active_connections[user.id].close()
		self.logger.info(f"User : {user.id}, created {user.created_at} playing : {user.playing}")

		self.logger.info(user.playing)

		#for invitation
		sender = query_params.get("sender", [None])[0]
		mode = query_params.get("mode", [None])[0]
		recipient = query_params.get("recipient", [None])[0]
		watch = query_params.get("watch", [None])[0]

		if sender: # invitation: WS msg from B, A invite B, sender is A
			#print(f"groupname: user_{user.username}", flush=True)
			if user.playing or (await self.get_user(sender)).playing:
				for group in [f"user_{user.username}", f"user_{sender}"]:
					channel_layer = get_channel_layer()
					await channel_layer.group_send(
						group, {
							"type": "send_message",
							"message": f"{user.username} accepted {sender}'s invitation, but {sender} is in another game",
							"message_type": "system",
							"sender": "admin",
							"recipient": "public",
							"time": datetime.now().strftime("%H:%M:%S")
						}
					)
				return # one of the players is in another game, no new game created
			if not await self.is_valid_invite(await self.get_user(sender), self.user):
				self.logger.info(f"Invalid invitation from {sender} to {self.user.username}")
				return # invalid invitation
			game_db = await game_manager.create_game_history(user, player_right=await self.get_user(sender), game_type='Invite', game_mode=mode)
			self.game = GameBackend(game_db.id, 0, game_manager, False, mode, False, False)
			game_manager.games[game_db.id] = self.game
			self.game.channel_layer = self.channel_layer
			self.game.assign_player(user, self.channel_name)
			await user_update_game(self.user, True, game_id=self.game.game_id)
			active_connections[self.user.id] = self
			await self.accept()
			self.logger.info("User accepted")

			await self.channel_layer.group_add(str(self.game.game_id), self.channel_name)

			# game created, send message to inviter
			inviter_group = f"user_{sender}"
			await self.channel_layer.group_send(
				inviter_group, {
					"type": "send_message",
					"message": "accepted your invite",
					"message_type": "system_accept",
					"sender": user.username,
					"game_mode": "TO ADD",
					"recipient": sender,
					"time": datetime.now().strftime("%H:%M:%S")
				}
			)
			return
		elif watch:
			user=await get_user_by_name(watch)
			game_id = user.current_game_id
			if (game_id == -1):
				return
			self.game = game_manager.games.get(int(game_id))
			if not self.game:
				await self.send(text_data=json.dumps({
					"type": "handle_error",
					"message": "Game not found."
				}))
				return
			self.logger.info(f"Spectator connected to game {game_id}")
			self.spectator = True
			await self.accept()
			active_connections[self.user.id] = self
			await self.channel_layer.group_add(str(self.game.game_id), self.channel_name)
			await self.send_initial_game_state(self.game)

		elif watchId:
			game_id = int(watchId)
			if (game_id == -1):
				return
			self.game = game_manager.games.get(int(game_id))
			if not self.game:
				await self.send(text_data=json.dumps({
					"type": "handle_error",
					"message": "Game not found."
				}))
				return
			self.logger.info(f"Spectator connected to game {game_id}")
			self.spectator = True
			await self.accept()
			active_connections[self.user.id] = self
			await self.channel_layer.group_add(str(self.game.game_id), self.channel_name)
			await self.send_initial_game_state(self.game)

		elif recipient: # invitation: WS msg from A, A invite B, recipient is B
			game_db = await game_manager.get_invite_game(await self.get_user(recipient), user)
			self.game = game_manager.games[game_db.id]
			self.game.channel_layer = self.channel_layer
			self.game.assign_player(user, self.channel_name)
			await user_update_game(self.user, True, game_id=self.game.game_id)
			await self.accept()
			active_connections[self.user.id] = self

			await self.channel_layer.group_add(str(self.game.game_id), self.channel_name)

			if (self.game.is_full()):
				self.logger.info(f"Game is ready to start,game is full {self.game}")
				await game_manager.set_game_state(await game_manager.get_game_by_id(self.game.game_id), 'playing')
				await self.send_initial_game_state(self.game)
			return
		else: # quick match or bot
			bot = int(query_params.get("bot", [0])[0])
			local = query_params.get("local", [None])[0]
			if not mode:
				mode = 'classic'
			if mode != 'classic' and mode != 'rumble':
				self.logger.error(f"Invalid game mode '{mode}'")
				return


			self.logger.info("Searching for a game for " + user.username)
			await database_sync_to_async(user.refresh_from_db)() # refresh user object
			self.logger.debug(game_manager.games)
			tournament_game_id = await game_manager.tournament_player(user)
			if tournament_game_id:
				self.logger.info(f"User {user.username} is already in a tournament: {tournament_game_id}")
				if not game_manager.games[tournament_game_id]:
					self.logger.error("Game not found in the game manager")
					return
				self.game = game_manager.games[tournament_game_id]
			else:
				self.game = game_manager.get_player_current_game(user)
				self.game = await game_manager.get_game(user, bot, mode, local=local)
			self.game.channel_layer = self.channel_layer
			self.game.assign_player(user, self.channel_name)
			await user_update_game(self.user, True, self.game.game_id)
			self.logger.info("User accepted")
			await self.accept()
			active_connections[self.user.id] = self
			await self.channel_layer.group_add(str(self.game.game_id), self.channel_name)

			if (self.game.is_full()):
				self.logger.info(f"Game is ready to start,game is full {self.game}")
				await game_manager.set_game_state(await game_manager.get_game_by_id(self.game.game_id), 'playing')
				await self.send_initial_game_state(self.game)


	
	async def receive(self, text_data):
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
				await self.game.set_player_init(self.channel_name)

		except json.JSONDecodeError:
			print("Error decoding JSON message")
		except Exception as e:
			print(f"Error handling message: {e}")

	async def handle_error(self, event):
		self.logger.info(f"Errorr received  {event}")
		await self.send(text_data=json.dumps(event))


	async def disconnect(self, close_code):
		if self.user.id in active_connections:
			del active_connections[self.user.id]
		if (self.spectator):
			self.logger.info(f"Spectator disconnected")
			await self.channel_layer.group_discard(str(self.game.game_id), self.channel_name)
			return
		if (self.game and self.game.game_id):
			await user_update_game(self.user, False, game_id=-1)
			if (self.game.is_full()):
				await self.channel_layer.group_discard(str(self.game.game_id), self.channel_name)
				self.logger.info(f"Disconnecting user {self.user.username}")
				await self.game.player_disc(self.user)
			else:
				self.logger.info(f"Deleting game n {self.game.game_id}")
				await delete_game_history(self.game.game_id)
		self.logger.info(f"WebSocket disconnected with code: {close_code}")

	async def chat_message(self, event):
		await self.send(text_data=json.dumps({"message":event["text"]}))

	async def game_update(self, event):
		try:
			#self.logger.info("Sending game updates")
			await self.send(text_data=json.dumps({
				"type": "game_update",
				"data":event["data"]
			}))
		except Exception as e:
			self.logger.info(f"Crashed in update {e}")

	async def get_color(self, user):
		color_map = {
			0: '#447AFF',
			1: "#00BDD1",
			2: "#00AD06",
			3: "#E67E00",
			4: "#E6008F",
			5: "#6900CC",
			6: "#E71200",
			7: "#0EC384",
			8: "#E6E3E1",
			9: "#D5DA2B"
		}
		try:
			user_preference = await get_user_preference(user)
			color = color_map.get(user_preference.color)
			if (color is None):
				return "#00BDD1" #Cyan
			else:
				return color
		except:
			return "#00BDD1" #Cyan

	async def send_initial_game_state(self, instance):
		if (instance.player_right.user.avatar_42 and instance.player_right.user.is_42_avatar_used):
			self.logger.info("Avatar 42 found")
			avatarRight = instance.player_right.user.avatar_42
		elif (instance.player_right.user.avatar):
			avatarRight = instance.player_right.user.avatar.url
			self.logger.info("Avatar found")
		else:
			avatarRight = '/imgs/default_avatar.png'

		if (instance.player_left.user.avatar_42 and instance.player_left.user.is_42_avatar_used):
			self.logger.info("Avatar 42 found")
			avatarLeft = instance.player_left.user.avatar_42
		elif (instance.player_left.user.avatar):
			avatarLeft = instance.player_left.user.avatar.url
			self.logger.info("Avatar found")
		else:
			avatarLeft = '/imgs/default_avatar.png'

		if (instance.player_left.user.display_name):
			usernameLeft = instance.player_left.user.display_name
		else:
			usernameLeft = instance.player_left.user.username

		if (instance.player_right.user.display_name):
			usernameRight = instance.player_right.user.display_name
		else:
			usernameRight = instance.player_right.user.username

		player_left_statistic = await get_user_statistic(instance.player_left.user)
		player_right_statistic = await get_user_statistic(instance.player_right.user) if instance.bot == 0 else None

		if (instance.game_mode == "classic"):
			player_left_elo = player_left_statistic.classic_elo
			player_right_elo = player_right_statistic.classic_elo if player_right_statistic else instance.player_right.user.elo
		elif (instance.game_mode == "rumble"):
			player_left_elo = player_left_statistic.rumble_elo
			player_right_elo = player_right_statistic.rumble_elo if player_right_statistic else instance.player_right.user.elo

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
							"name": usernameLeft,
							"elo": player_left_elo,
							"score": instance.game.player_left.score,
							"avatar" : avatarLeft,
							"color": await self.get_color(instance.player_left.user)
						},
						"right": {
							"name": usernameRight,
							"elo": player_right_elo,
							"score": instance.game.player_right.score,
							"avatar" : avatarRight,
							"color" : await self.get_color(instance.player_right.user)
						}
					}
				}
			}

			# Send the response to the group (or WebSocket connection)
		await self.channel_layer.group_send(str(instance.game_id), init_response)

	async def init(self, event):
		print(event, flush=True)
		await self.send(text_data=json.dumps({
			"message_type": "init",
			"data": event["data"]}))

	@database_sync_to_async
	def get_user(self, username):
		User = get_user_model()
		user = User.objects.get(username=username)
		return user

