import asyncio
import time
import logging
import json
from .game_logic import GameInstance, GameBounds
from channels.db import database_sync_to_async
from .bot import Bot

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
				self.logger.info("started game with a bot")
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
				self.game.winner = self.player_left.user.username
			elif self.game.winner == "RIGHT":
				self.game.winner = self.player_right.user.username

			await self.broadcast_state()

			if self.player_left:
				self.logger.info(f"Resetting left player: {self.player_left.user.username}")
				await self.manager.reset_player_game(self.player_left.user)

			if self.player_right and not self.is_bot_game:
				self.logger.info(f"Resetting right player: {self.player_right.user.username}")
				await self.manager.reset_player_game(self.player_right.user)

			self.manager.remove_game(self.game_id)
			await self.manager.set_game_state(await self.manager.get_game_by_id(self.game_id), 'finished', self.game.player_left.score, self.game.player_right.score)
			#TODO Add to history
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
		self.logger.info("Before sending broadcast")
		try:
			await self.channel_layer.group_send(str(self.game_id), state)
			self.logger.info("After sending broadcast")
		except Exception as e
			self.logger.info(f"Error {e}")
