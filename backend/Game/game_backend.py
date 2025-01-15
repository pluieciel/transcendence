import asyncio
import time
import logging
import json
from .game_logic import GameInstance, GameBounds
from channels.db import database_sync_to_async
from .bot import Bot
from api.user_db_utils import user_update_game
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
	def __init__(self, room_id, bot, manager, ranked):
		self.game_id = room_id
		self.game = GameInstance(self.broadcast_state, self.on_game_end)
		self.game_mode = "Vanilla"
		self.is_ranked = ranked
		self.channel_layer = None
		self.manager = manager
		self.player_left = None
		self.player_right = None
		self.logger = logging.getLogger('game')
		self.elo_k_factor = 40
		self.is_bot_game = bot and bot > 0
		if (self.is_bot_game):
			self.player_right = Bot(bot, self.game)
		self.logger.info(f"{self.is_bot_game} and {bot}")
		from Chat.consumer import ChatConsumer
		self.chat_consumer = ChatConsumer
	def handle_key_event(self, websocket, key, is_down):
		if websocket == self.player_left.channel:
			self.logger.info(f"Left player pressed {key}")
			self.game.player_left.keys[key] = is_down
		elif websocket == self.player_right.channel:
			self.logger.info(f"Right player pressed {key}")
			self.game.player_right.keys[key] = is_down

	def is_full(self):
		self.logger.info(self.player_left is not None and self.player_right is not None)
		self.logger.info(self.player_right)
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
				winner = self.player_left.user
				self.game.winner = winner.username
			elif self.game.winner == "RIGHT":
				winner = self.player_right.user
				self.game.winner = winner.username

			await self.broadcast_state()

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
				self.chat_consumer.tournament_info["round1"][f"game{next_game_place}"]["winner"] = winner.username
				next_game_id = game_history_db.tournament_round2_game_id
				new_game_history_db = await self.manager.get_game_by_id(next_game_id)
				if next_game_place == 1:
					await self.manager.set_game_state(new_game_history_db, 'waiting', player_a=winner)
					self.chat_consumer.tournament_info["round2"]["game1"]["p1"] = winner.username
				else:
					await self.manager.set_game_state(new_game_history_db, 'waiting', player_b=winner)
					self.chat_consumer.tournament_info["round2"]["game1"]["p2"] = winner.username
				
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
				self.chat_consumer.tournament_info["round2"]["game1"]["winner"] = winner.username
	
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


	@database_sync_to_async
	def update_user_elo(self, user, elo):
		user.elo = elo
		user.save()

	async def update_elo(self, winner):
		elo_pleft = self.player_left.user.elo
		elo_pright = self.player_right.user.elo

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

		await self.update_user_elo(self.player_left.user, new_elo_pleft)
		if not self.is_bot_game:
			await self.update_user_elo(self.player_right.user, new_elo_pright)

	async def broadcast_state(self):
		events = []
		if self.game.scored:
			events.append({"type": "score", "position": vars(self.game.scorePos)})
			self.game.scored = False
		if self.game.ended:
			self.logger.info(f"Appending winner info with {self.game.winner}")
			events.append({"type": "game_end", "winner": self.game.winner})

		trajectory_points = self.game.ball.predict_trajectory()
		trajectory_data = [vars(point) for point in trajectory_points]

		state = {
			"type": "game.update",
			"data": {
				"positions": {
					"player_left": vars(self.game.player_left.position),
					"player_right": vars(self.game.player_right.position),
					"ball": vars(self.game.ball.position),
					"borders": {
						"top": vars(self.game.bounds.top),
						"bottom": vars(self.game.bounds.bottom),
						"left": vars(self.game.bounds.left),
						"right": vars(self.game.bounds.right),
					}
				},
				"trajectory": trajectory_data,
				"player": {
					"left": {
						"name": self.player_left.user.username,
						"rank": self.player_left.user.elo,
						"score": self.game.player_left.score
					},
					"right": {
						"name": self.player_right.user.username,
						"rank": self.player_right.user.elo,
						"score": self.game.player_right.score
					}
				},
				"game_started": self.game.is_running,
				"events": events
			}
		}
		try:
			await self.channel_layer.group_send(str(self.game_id), state)
		except Exception as e:
			self.logger.info(f"Error {e}")
