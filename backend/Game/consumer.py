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
from channels.layers import get_channel_layer
from datetime import datetime
from time import sleep
from api.db_utils import user_update_game, delete_game_history

class GameManager:
	def __init__(self):
		self.game_history = None
		self.games = {}
		self.logger = logging.getLogger('game')
		self.tournament_count = 0

	def _get_game_history_model(self):
		if self.game_history is None:
			from api.models import GameHistory
			from Chat.consumer import ChatConsumer
			self.game_history = GameHistory
			self.chat_consumer = ChatConsumer

	def remove_game(self, game_id):
		if game_id in self.games:
			game = self.games[game_id]
			del self.games[game_id]

	async def get_game(self, user, bot, mode):
		self._get_game_history_model()
		self.logger.info(f"Getting game for user {user.username}")
		game = None
		if (bot == 0):
			game = await self.check_available_game(mode)
		if (game is None):
			game = await self.create_game(user, bot, mode)
		return (game)

	def get_player_current_game(self, user):
		#TODO uncomment
		#self.logger.info(f"currentGame {user.current_game_id}")
		#self.logger.info(self.games)
		#if (user.is_playing and self.games and self.games[user.current_game_id]):
		#	return (self.games[user.current_game_id])
	#	if user.current_game_id != -1:
		#		return self.games.get(user.current_game_id, None)
		return None

	async def check_available_game(self, mode):
		games = await self.get_waiting_game(mode)
		if (await self.is_game_exists(games)):
			game = await self.get_first_game(games)
			await self.set_game_state(game, 'playing')
			return self.games[game.id]
		return None

	async def create_game(self, user, bot, mode):
		self._get_game_history_model()
		if (bot == 0):
			game_id = (await self.create_game_history(user, game_mode=mode)).id
		else:
			game_id = (await self.create_game_history(user, game_category='AI', game_mode=mode)).id
		self.games[game_id] = GameBackend(game_id, bot, self, bot == 0, mode)
		return self.games[game_id]

	async def create_tournament_empty_games(self, tournament_info):
		self.tournament_count += 1
		self._get_game_history_model()
		p1 = tournament_info["round1"][f"game1"]["p1"]
		p2 = tournament_info["round1"][f"game1"]["p2"]
		p3 = tournament_info["round1"][f"game2"]["p1"]
		p4 = tournament_info["round1"][f"game2"]["p2"]
		game_id3 = (await self.create_game_history(None, None, game_category='Tournament2', tournament_count=self.tournament_count)).id
		game_id1 = (await self.create_game_history(await self.get_user(p1), await self.get_user(p2), game_category='Tournament1', tournament_count=self.tournament_count, tournament_round2_game_id=game_id3, tournament_round2_place=1)).id
		game_id2 = (await self.create_game_history(await self.get_user(p3), await self.get_user(p4), game_category='Tournament1', tournament_count=self.tournament_count, tournament_round2_game_id=game_id3, tournament_round2_place=2)).id
		self.games[game_id1] = GameBackend(game_id1, 0, self, False, 'classic')
		self.games[game_id2] = GameBackend(game_id2, 0, self, False, 'classic')
		self.games[game_id3] = GameBackend(game_id3, 0, self, False, 'classic')
		print(f"3games created {game_id1}, {game_id2}, {game_id3}, players: {p1}, {p2}, {p3}, {p4}", flush=True)

	@database_sync_to_async
	def get_waiting_game(self, game_mode):
		return self.game_history.objects.filter(game_state='waiting', game_mode=game_mode)

	@database_sync_to_async
	def get_invite_game(self, player_a, player_b, game_category='Invite'):
		game = self.game_history.objects.filter(player_a=player_a, player_b=player_b, game_state='waiting', game_category=game_category)
		if not game.exists():
			self.logger.info("Waiting for the game to be created")
			sleep(0.5)
			game = self.game_history.objects.filter(player_a=player_a, player_b=player_b, game_state='waiting', game_category=game_category)
		return game.first()

	@database_sync_to_async
	def get_tournament_game(self, p1, p2, game_category='Tournament1'):
		game = self.game_history.objects.filter(player_a=p1, player_b=p2, game_state='waiting', game_category=game_category)
		return game.first()

	@database_sync_to_async
	def create_game_history(self, player_a, player_b=None, game_category='ranked', game_mode='classic', game_state='waiting', tournament_count=0, tournament_round2_game_id=-1, tournament_round2_place=-1):
		return self.game_history.objects.create(player_a=player_a, player_b=player_b, game_category=game_category, game_mode=game_mode, game_state=game_state, tournament_count=tournament_count, tournament_round2_game_id=tournament_round2_game_id, tournament_round2_place=tournament_round2_place)

	@database_sync_to_async
	def save_game_history(self, game_history):
		game_history.save()

	@database_sync_to_async
	def is_game_exists(self, games):
		return games.exists()

	@database_sync_to_async
	def get_first_game(self, games):
		return games.first()

	@database_sync_to_async
	def set_game_state(self, game, game_state, score_a = 0, score_b = 0, player_a = None, player_b = None):
		game.score_a = score_a
		game.score_b = score_b
		game.game_state = game_state
		if player_a:
			game.player_a = player_a
		if player_b:
			game.player_b = player_b
		game.save()

	@database_sync_to_async
	def get_game_by_id(self, game_id):
		return self.game_history.objects.get(id=game_id)

	@database_sync_to_async
	def get_user(self, username):
		User = get_user_model()
		user = User.objects.get(username=username)
		return user

game_manager = GameManager()

class GameConsumer(AsyncWebsocketConsumer):

	async def connect(self):
		from api.models import is_valid_invite
		self.is_valid_invite = is_valid_invite
		self.game = None
		self.logger = logging.getLogger('game')
		self.logger.info(f"Websocket connection made with channel name {self.channel_name}")

		query_string = self.scope["query_string"].decode()
		query_params = parse_qs(query_string)
		#for invitation
		sender = query_params.get("sender", [None])[0]
		mode = query_params.get("mode", [None])[0]
		recipient = query_params.get("recipient", [None])[0]
		#for tournament
		round = query_params.get("round", [None])[0]

		user = await jwt_to_user(self.scope['headers'])
		self.user = user
		if not self.user:
			await self.send(text_data=json.dumps({
				"type": "handle_error",
				"message": "Invalid JWT"
			}))
			return
		game_manager._get_game_history_model()

		if sender: # invitation: WS msg from B, A invite B, sender is A
			#print(f"groupname: user_{user.username}", flush=True)
			if user.is_playing or (await self.get_user(sender)).is_playing:
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
			game_db = await game_manager.create_game_history(user, player_b=await self.get_user(sender), game_category='Invite')
			self.game = GameBackend(game_db.id, 0, game_manager, False, mode) #TODO Ranked mode
			game_manager.games[game_db.id] = self.game
			self.game.channel_layer = self.channel_layer
			self.game.assign_player(user, self.channel_name)
			await user_update_game(self.user, isplaying=True, game_id=self.game.game_id)
			await self.accept()

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

		elif recipient: # invitation: WS msg from A, A invite B, recipient is B
			game_db = await game_manager.get_invite_game(await self.get_user(recipient), user)
			self.game = game_manager.games[game_db.id]
			self.game.channel_layer = self.channel_layer
			self.game.assign_player(user, self.channel_name)
			await user_update_game(self.user, isplaying=True, game_id=self.game.game_id)
			await self.accept()

			await self.channel_layer.group_add(str(self.game.game_id), self.channel_name)

			if (self.game.is_full()):
				self.logger.info(f"Game is ready to start,game is full {self.game}")
				await game_manager.set_game_state(await game_manager.get_game_by_id(self.game.game_id), 'playing')
				await self.send_initial_game_state(self.game)
			return

		elif round: # tournament
			if round == "1":
				p1 = query_params.get("p1", [None])[0]
				p2 = query_params.get("p2", [None])[0]
				game = query_params.get("game", [None])[0]
				self.logger.info(f"Game : {game}")
				game_db = await game_manager.get_tournament_game(await self.get_user(p1), await self.get_user(p2))
				self.game = game_manager.games[game_db.id]
				self.game.channel_layer = self.channel_layer
				self.game.assign_player(user, self.channel_name)
				await user_update_game(self.user, isplaying=True, game_id=self.game.game_id)
				await self.accept()
				await self.channel_layer.group_add(str(self.game.game_id), self.channel_name)
				if (self.game.is_full()):
					self.logger.info(f"Tournament R1 {game} is ready to start,game is full")
					game_manager.chat_consumer.tournament_info["round1"][f"{game}"]["state"] = "playing"
					await game_manager.set_game_state(await game_manager.get_game_by_id(self.game.game_id), 'playing')
					await self.send_initial_game_state(self.game)
			elif round == "2":
				p1 = query_params.get("p1", [None])[0]
				p2 = query_params.get("p2", [None])[0]
				game_db = await game_manager.get_tournament_game(await self.get_user(p1), await self.get_user(p2), game_category='Tournament2')
				self.game = game_manager.games[game_db.id]
				self.game.channel_layer = self.channel_layer
				self.game.assign_player(user, self.channel_name)
				await user_update_game(self.user, isplaying=True, game_id=self.game.game_id)
				await self.accept()
				await self.channel_layer.group_add(str(self.game.game_id), self.channel_name)
				if (self.game.is_full()):
					self.logger.info("Tournament R2 Game is ready to start,game is full")
					game_manager.chat_consumer.tournament_info["round2"]["game1"]["state"] = "playing"
					await game_manager.set_game_state(await game_manager.get_game_by_id(self.game.game_id), 'playing')
					await self.send_initial_game_state(self.game)
			return


		else: # quick match or bot
			bot = int(query_params.get("bot", [0])[0])
			if not mode:
				mode = 'classic'
			if mode != 'classic' and mode != 'rumble':
				self.logger.error(f"Invalid game mode '{mode}'")
				return


			self.logger.info("Searching for a game for " + user.username)
			await database_sync_to_async(user.refresh_from_db)() # refresh user object
			self.logger.debug(game_manager.games)
			self.game = game_manager.get_player_current_game(user)
			if (self.game):
				self.logger.info("User found in a game, disconnecting the old session")
			else:
				self.game = await game_manager.get_game(user, bot, mode)
			self.game.channel_layer = self.channel_layer
			self.game.assign_player(user, self.channel_name)
			await user_update_game(self.user, isplaying=True, game_id=self.game.game_id)
			await self.accept()

			await self.channel_layer.group_add(str(self.game.game_id), self.channel_name)

			if (self.game.is_full()):
				self.logger.info(f"Game is ready to start,game is full {self.game}")
				await game_manager.set_game_state(await game_manager.get_game_by_id(self.game.game_id), 'playing')
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
		if (self.game and self.game.game_id):
			if (self.game.is_full()):
				await self.channel_layer.group_discard(str(self.game.game_id), self.channel_name)
				self.logger.info(f"Disconnecting user {self.user.username}")
				await user_update_game(self.user, isplaying=False, game_id=-1)
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

	def get_color(self, user):
		color_map = {
			0: '#3E27F8',
			1: "#00BDD1",
			2: "#00AD06",
			3: "#E67E00",
			4: "#E6008F",
			5: "#6400C4",
			6: "#E71200",
			7: "#0EC384",
			8: "#E6E3E1"
		}
		try:
			color = color_map.get(user.color)
			if (color is None):
				return "#00BDD1" #Cyan
			else:
				return color
		except:
			logging.getLogger('game').warn(f"no color found in settings defaulting to cyan")
			return "#00BDD1" #Cyan

	async def send_initial_game_state(self, instance):
		if (instance.player_right.user.avatar42):
			self.logger.info("Avatar 42 found")
			avatarRight = instance.player_right.user.avatar42
		elif (instance.player_right.user.avatar):
			avatarRight = instance.player_right.user.avatar.url
			self.logger.info("Avatar found")
		else:
			avatarRight = '/default_avatar.png'

		if (instance.player_left.user.avatar42):
			self.logger.info("Avatar 42 found")
			avatarLeft = instance.player_left.user.avatar42
		elif (instance.player_left.user.avatar):
			avatarLeft = instance.player_left.user.avatar.url
			self.logger.info("Avatar found")
		else:
			avatarLeft = '/default_avatar.png'

		if (instance.player_left.user.display):
			usernameLeft = instance.player_left.user.display
		else:
			usernameLeft = instance.player_left.user.username

		if (instance.player_right.user.display):
			usernameRight = instance.player_right.user.display
		else:
			usernameRight = instance.player_right.user.username


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
							"rank": instance.player_left.user.elo,
							"score": instance.game.player_left.score,
							"avatar" : avatarLeft,
							"color": self.get_color(instance.player_left.user)
						},
						"right": {
							"name": usernameRight,
							"rank": instance.player_right.user.elo,
							"score": instance.game.player_right.score,
							"avatar" : avatarRight,
							"color" :self.get_color(instance.player_right.user)
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

	async def send_message(self, event):
		message = event["message"]
		sender = event["sender"]
		recipient = event["recipient"]
		time = event["time"]
		message_type = event["message_type"]
		game_mode = event.get("game_mode", None)
		usernames = event.get("usernames", None)
		tournament_info = event.get("tournament_info", None)

		await self.send(text_data=json.dumps({
			"message": message,
			"message_type": message_type,
			"sender": sender,
			"recipient": recipient,
			"game_mode": game_mode,
			"usernames" : usernames,
			"time": time,
			"tournament_info": tournament_info,
		}))
