import asyncio
import time
import logging
import json
from .normal_game_logic import ClassicGameInstance, GameBounds
from .rumble_game_logic import RumbleGameInstance, GameBounds
from channels.db import database_sync_to_async
from .bot import Bot
from api.db_utils import finish_game_history, user_update_game, add_user_wins, add_user_looses, delete_game_history, get_user_preference, get_user_statistic
from datetime import datetime
import redis
from channels.layers import get_channel_layer
from copy import deepcopy
class User:
	def __init__(self, user, channel, state):
		self.user = user
		self.channel = channel
		self.state = state

class GameBackend:
	def __init__(self, room_id, bot, manager, ranked, mode):
		self.logger = logging.getLogger('game')
		self.game_id = room_id
		self.game_mode = mode
		self.game = self.get_game_instance(self.game_mode)
		self.is_ranked = ranked
		self.channel_layer = None
		self.manager = manager
		self.player_left = None
		self.player_right = None
		self.elo_change = 0

		self.elo_k_factor = 40
		self.is_bot_game = bot and bot > 0

		if (self.is_bot_game):
			self.player_right = Bot(bot, self.game)
		self.logger.info(f"{self.is_bot_game} and {bot}")
		from Chat.consumer import ChatConsumer
		self.chat_consumer = ChatConsumer
	def handle_key_event(self, websocket, key, is_down):
		if websocket == self.player_left.channel:
			self.game.player_left.keys[key] = is_down
		elif websocket == self.player_right.channel:
			self.game.player_right.keys[key] = is_down

	def get_game_instance(self, mode):
		if (mode == "classic"):
			return ClassicGameInstance(self.broadcast_state, self.on_game_end)
		elif (mode == "rumble"):
			return RumbleGameInstance(self.rumble_broadcast_state, self.rumble_revert_event_broadcast, self.on_game_end)
		else:
			self.logger.error("Game mode not found")



	def is_full(self):
		return (self.player_left is not None and self.player_right is not None)

	def start_game(self):
		if self.is_full() and not self.game.is_running:
			self.player_left.state = "Playing"
			self.player_right.state = "Playing"
			if (self.is_bot_game):
				self.logger.info("started game with a bot")
				self.player_right.start_bot()
			else:
				self.logger.info("started game with a player")
			self.game.start()
		else:
			self.logger.warning("start game caleld but game is not full")

	def stop_game(self):
		self.game.stop()

	async def player_disc(self, user):
		if (self.player_left and self.player_left.user.id == user.id and not self.game.ended):
			self.logger.info("Player left disconnected, calling forfeit")
			await self.game.forfeit("LEFT")
		elif (self.player_right and self.player_right.user.id == user.id and not self.game.ended):
			self.logger.info("Player right disconnected, calling forfeit")
			await self.game.forfeit("RIGHT")
		else:
			self.logger.warning("Player disc called but user not found")

	def player_in_game(self, user):
		if (self.player_left and self.player_left.user.id == user.id):
			return True
		elif (self.player_right and self.player_right.user.id == user.id):
			return True
		return False

	async def disconnect_user(self, user):
		old_channel = None
		if (self.player_left and self.player_left.user.id == user.id):
			old_channel = self.player_left.channel
			self.player_left = None
		elif (self.player_right and self.player_right.user.id == user.id):
			old_channel = self.player_right.channel
			self.player_right = None
		return old_channel

	def assign_player(self, user, channel):
		if not self.player_left or self.player_left.user.id == user.id:
			self.player_left = User(user, channel, "Connected")
			self.logger.info(f"Creating user for player left {self.player_left.user.username}")
		elif not self.player_right or self.player_right.user.id == user.id:
			self.player_right = User(user, channel, "Connected")
			self.logger.info(f"Creating user for player right {self.player_right.user.username}")
		else:
			raise Exception("Error : assign player when two player were in a game")

	def set_player_init(self, channel):
			if (self.player_left.channel == channel):
				self.logger.info(f"is bot game {self.is_bot_game}")
				self.player_left.state = "Ready"
				self.check_ready_game()
			elif self.is_bot_game:
				self.check_ready_game()
			elif (self.player_right.channel == channel):
				self.logger.info(f"is bot game {self.is_bot_game}")
				self.player_right.state = "Ready"
				self.check_ready_game()
			else:
				self.logger.warning("Received player init but couldnt match channel")

	def check_ready_game(self):
		if (self.player_left and self.player_left.state == "Ready" and self.is_bot_game or (self.player_right and self.player_right.state == "Ready")):
			self.logger.info("Both player ready, starting")
			self.start_game()
		else:
			self.logger.info("Not starting, both player not ready yet")

	async def on_game_end(self):
		try:
			if (self.is_ranked):
				await self.update_elo(self.game.winner)

			if self.game.winner == "LEFT":
				self.game.winner = self.player_left.user
				if (self.is_bot_game is False):
					await add_user_wins(self.player_left.user)
					await add_user_looses(self.player_right.user)
				self.logger.info("Updated win lose")
			elif self.game.winner == "RIGHT":
				self.game.winner = self.player_right.user
				if (self.is_bot_game is False):
					await add_user_wins(self.player_right.user)
					await add_user_looses(self.player_left.user)
				self.logger.info("Updated win lose")

			if (self.is_bot_game):
				await delete_game_history(self.game_id)
			else:
				await finish_game_history(self.game_id, self.game.player_left.score, self.game.player_right.score, self.elo_change, self.game.winner)

			if self.game_mode == "classic":
				await self.broadcast_state()
			else:
				await self.rumble_broadcast_state()

			if self.player_left:
				self.logger.info(f"Resetting left player: {self.player_left.user.username}")
				await user_update_game(self.player_left.user, isplaying=False, game_id=-1)


			if self.player_right and not self.is_bot_game:
				self.logger.info(f"Resetting right player: {self.player_right.user.username}")
				await user_update_game(self.player_left.user, isplaying=False, game_id=-1)

			self.manager.remove_game(self.game_id)
			game_history_db = await self.manager.get_game_by_id(self.game_id)
			await self.manager.set_game_state(game_history_db, 'finished', self.game.player_left.score, self.game.player_right.score)

			#next round for tournament
			if game_history_db.game_category == "Tournament1":
				next_game_place = game_history_db.tournament_round2_place
				self.chat_consumer.tournament_info["round1"][f"game{next_game_place}"]["winner"] = self.game.winner.username
				next_game_id = game_history_db.tournament_round2_game_id
				new_game_history_db = await self.manager.get_game_by_id(next_game_id)
				if next_game_place == 1:
					await self.manager.set_game_state(new_game_history_db, 'waiting', player_a=self.game.winner)
					self.chat_consumer.tournament_info["round2"]["game1"]["p1"] = self.game.winner.username
				else:
					await self.manager.set_game_state(new_game_history_db, 'waiting', player_b=self.game.winner)
					self.chat_consumer.tournament_info["round2"]["game1"]["p2"] = self.game.winner.username

				if self.chat_consumer.tournament_info["round2"]["game1"].get("p1", None) and self.chat_consumer.tournament_info["round2"]["game1"].get("p2", None):
					self.chat_consumer.tournament_info["round2"]["game1"]["state"] = "prepare"
					self.chat_consumer.tournament_info["state"] = "Playing2to1"

				redis_client = redis.Redis(host='redis', port=6379, db=0)
				groups = [g.decode('utf-8') for g in redis_client.smembers('active_groups')]
				channel_layer = get_channel_layer()
				for group in groups:
					await channel_layer.group_send(
						group, {
							"type": "send_message",
							"tournament_info": json.dumps(self.chat_consumer.tournament_info),
							"message_type": "system",
							"message": "update_tournament_info",
							"sender": "admin",
							"recipient": "update_tournament_info",
							"time": datetime.now().strftime("%H:%M:%S")
						}
					)
			elif game_history_db.game_category == "Tournament2":
				self.chat_consumer.tournament_info["round2"]["game1"]["winner"] = self.game.winner.username

				redis_client = redis.Redis(host='redis', port=6379, db=0)
				groups = [g.decode('utf-8') for g in redis_client.smembers('active_groups')]
				channel_layer = get_channel_layer()
				for group in groups:
					await channel_layer.group_send(
						group, {
							"type": "send_message",
							"tournament_info": json.dumps(self.chat_consumer.tournament_info),
							"message_type": "system",
							"message": "update_tournament_info",
							"sender": "admin",
							"recipient": "update_tournament_info",
							"time": datetime.now().strftime("%H:%M:%S")
						}
					)
				await asyncio.sleep(30)
				self.chat_consumer.tournament_info = deepcopy(self.chat_consumer.tournament_info_initial)
				for group in groups:
					await channel_layer.group_send(
						group, {
							"type": "send_message",
							"tournament_info": json.dumps(self.chat_consumer.tournament_info),
							"message_type": "system",
							"message": "update_tournament_info",
							"sender": "admin",
							"recipient": "update_tournament_info",
							"time": datetime.now().strftime("%H:%M:%S")
						}
					)

		except Exception as e:
			self.logger.error(f"Error in on_game_end: {str(e)}")
			import traceback
			self.logger.error(traceback.format_exc())

	async def update_elo(self, winner):
		player_left_statistic = await get_user_statistic(self.player_left.user)
		player_right_statistic = await get_user_statistic(self.player_right.user)

		if (self.game_mode == "classic"):
			elo_pleft = player_left_statistic.classic_elo
			elo_pright = player_right_statistic.classic_elo
		elif (self.game_mode == "rumble"):
			elo_pleft = player_left_statistic.rumble_elo
			elo_pright = player_right_statistic.rumble_elo

		expected_score_pleft = 1 / (1 + 10 ** ((elo_pright - elo_pleft) / 400))
		expected_score_pright = 1 - expected_score_pleft

		if (winner == "LEFT"):
			actual_score_pleft = 1
			actual_score_pright = 0
		elif (winner == "RIGHT"):
			actual_score_pleft = 0
			actual_score_pright = 1
		else:
			self.logger.error("update elo but winner is neither left or right")
			return 0

		new_elo_pleft = elo_pleft + self.elo_k_factor * (actual_score_pleft - expected_score_pleft)
		new_elo_pright = elo_pright + self.elo_k_factor * (actual_score_pright - expected_score_pright)

		elo_change = abs(new_elo_pleft - elo_pleft)
		self.elo_change = round(elo_change)

		if (self.game_mode == "classic"):
			await self.update_user_statistic_classic_elo(player_left_statistic, new_elo_pleft)
			await self.update_user_statistic_classic_elo(player_right_statistic, new_elo_pright)
		elif (self.game_mode == "rumble"):
			await self.update_user_statistic_rumble_elo(player_left_statistic, new_elo_pleft)
			await self.update_user_statistic_rumble_elo(player_right_statistic, new_elo_pright)

	async def get_color(self, user):
		color_map = {
			0: '#447AFF',
			1: "#00BDD1",
			2: "#00AD06",
			3: "#E67E00",
			4: "#E6008F",
			5: "#6400C4",
			6: "#E71200",
			7: "#0EC384",
			8: "#E6E3E1",
			9: "#D5DA2B"
		}
		try:
			user_preference = await get_user_preference(user)
			color = color_map.get(user_preference.color)
			if (color is None):
				return "#00BDD1"
			else:
				return color
		except:
			logging.getLogger('game').warn(f"no color found in settings defaulting to cyan")
			return "#00BDD1"

	async def broadcast_state(self):
		events = []
		if self.game.scored:
			if self.game.scorer is not None:
				if (self.game.scorer == "LEFT"):
					color = await self.get_color(self.player_left.user)
				elif self.game.scorer == "RIGHT":
					color = await self.get_color(self.player_right.user)
				else:
					self.logger.info(f"color defaulted to grey cause winner is not left or right")
					color = '#676a6e'
				self.game.scorer = None
			else:
				self.logger.info(f"color defaulted to grey cause winner is none")
				color = '#676a6e'
			events.append({
			"type": "score",
			"position": vars(self.game.scorePos),
			"score_left": self.game.player_left.score,
			"score_right": self.game.player_right.score,
			"color" : color
			})
			self.game.scored = False
		if self.game.ended:
			if (self.game.winner.avatar_42):
				avatar = self.game.winner.avatar_42
			elif (self.game.winner.avatar):
				avatar = self.game.winner.avatar.url
			else:
				avatar = '/imgs/default_avatar.png'

			self.logger.info(f"Appending winner info with {self.game.winner.username}")
			if (self.game.winner.display_name):
				username = self.game.winner.display_name
			else:
				username = self.game.winner.username
			events.append({
				"type": "game_end",
				"winnerName": username,
				"winnerAvatar": avatar,
				"scoreLeft": self.game.player_left.score,
				"scoreRight": self.game.player_right.score,
				"eloChange": self.elo_change
		})
		if self.game.ball.lastHitter is not None:
			if (self.game.ball.lastHitter == "LEFT"):
				color = await self.get_color(self.player_left.user)
			elif self.game.ball.lastHitter == "RIGHT":
				color = await self.get_color(self.player_right.user)
			else:
				color = '#676a6e'
			events.append({"type": "ball_last_hitter", "color": color})

		trajectory_data = []

		ballX = self.game.ball.position.x
		ball_pos = vars(self.game.ball.position)
		state = {
			"type": "game.update",
			"data": {
				"positions": {
					"player_left": vars(self.game.player_left.position),
					"player_right": vars(self.game.player_right.position),
					"ball": ball_pos,
				},
				"trajectory": trajectory_data,
				"events": events
			}
		}
		try:
			await self.channel_layer.group_send(str(self.game_id), state)
		except Exception as e:
			self.logger.info(f"Error {e}")

	async def rumble_broadcast_state(self):
		events = []
		if self.game.scored:
			if self.game.scorer is not None:
				if (self.game.scorer == "LEFT"):
					color = await self.get_color(self.player_left.user)
				elif self.game.scorer == "RIGHT":
					color = await self.get_color(self.player_right.user)
				else:
					self.logger.info(f"color defaulted to grey cause winner is not left or right")
					color = '#676a6e'
				self.game.scorer = None
			else:
				self.logger.info(f"color defaulted to grey cause winner is none")
				color = '#676a6e'
			events.append({
			"type": "score",
			"position": vars(self.game.scorePos),
			"score_left": self.game.player_left.score,
			"score_right": self.game.player_right.score,
			"color" : color
			})
			self.game.scored = False
		if self.game.ended:
			if (self.game.winner.avatar_42):
				avatar = self.game.winner.avatar_42
			elif (self.game.winner.avatar):
				avatar = self.game.winner.avatar.url
			else:
				avatar = '/imgs/default_avatar.png'

			self.logger.info(f"Appending winner info with {self.game.winner.username}")
			if (self.game.winner.display_name):
				username = self.game.winner.display_name
			else:
				username = self.game.winner.username
			events.append({
				"type": "game_end",
				"winnerName": username,
				"winnerAvatar": avatar,
				"scoreLeft": self.game.player_left.score,
				"scoreRight": self.game.player_right.score,
				"eloChange": self.elo_change
		})
		if self.game.announceEvent or self.game.event.action != 'none':
			self.logger.info(f"Announcing event {self.game.event.name} and {self.game.event.description}")
			events.append({
				"type": "event",
				"icon": self.game.event.icon,
				"announce" : self.game.announceEvent,
				"name": self.game.event.name,
				"description": self.game.event.description,
				"action": self.game.event.action,
		})
		self.game.event.action = 'none'
		if (self.game.announceEvent):
			self.game.announceEvent = False
		if self.game.ball.lastHitter is not None:
			if (self.game.ball.lastHitter == "LEFT"):
				color = await self.get_color(self.player_left.user)
			elif self.game.ball.lastHitter == "RIGHT":
				color = await self.get_color(self.player_right.user)
			else:
				color = '#676a6e'
			events.append({"type": "ball_last_hitter", "color": color})

		if (self.game.event.name == 'Visible Trajectory'):
			trajectory_points = self.game.ball.predict_trajectory()
			trajectory_data = [vars(point) for point in trajectory_points]
		else:
			trajectory_data = []

		ballX = self.game.ball.position.x

		if (self.game.event.name == 'SmokeCloud' and ballX >= -6 and ballX <= 6):
			ball_pos = {
				"x": 1000,
				"y": 1000,
				"z": 1000
			}
		else:
			ball_pos = vars(self.game.ball.position)
		state = {
			"type": "game.update",
			"data": {
				"positions": {
					"player_left": vars(self.game.player_left.position),
					"player_right": vars(self.game.player_right.position),
					"ball": ball_pos,
				},
				"trajectory": trajectory_data,
				"events": events
			}
		}
		try:
			await self.channel_layer.group_send(str(self.game_id), state)
		except Exception as e:
			self.logger.info(f"Error {e}")

	async def rumble_revert_event_broadcast(self):
		events = []
		if (self.game.event.action != 'none'):
			action = self.game.event.action
			self.game.event.action = 'none'
			events.append({
				"type": "event",
				"icon": self.game.event.icon,
				"name": self.game.event.name,
				"announce" : False,
				"description": self.game.event.description,
				"action": action,
			})
			state = {
				"type": "game.update",
				"data": {
					"events": events
				}
			}
		try:
			await self.channel_layer.group_send(str(self.game_id), state)
		except Exception as e:
			self.logger.info(f"Error {e}")

	@database_sync_to_async
	def update_user_statistic_classic_elo(self, user_statistic, elo):
		from api.models import UserStatistic
		user_statistic.classic_elo = elo
		user_statistic.save()

	@database_sync_to_async
	def update_user_statistic_rumble_elo(self, user_statistic, elo):
		from api.models import UserStatistic
		user_statistic.rumble_elo = elo
		user_statistic.save()
