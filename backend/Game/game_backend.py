import asyncio
import time
import logging
from .game_logic import GameInstance, GameBounds

class User:
	def __init__(self, user, channel, state):
		self.user = user
		self.channel = channel
		self.state = state

class GameBackend:
	def __init__(self, room_id):
		self.game_id = room_id
		self.game = GameInstance(self.broadcast_state)
		self.game_mode = "Vanilla"
		self.channel_layer = None
		self.player_left = None
		self.player_right = None
		self.logger = logging.getLogger('game')

	def handle_key_event(self, websocket, key, is_down):
		print(f"Handling key event: {key} {is_down}")
		if websocket == self.player_left.channel:
			self.game.player_left.keys[key] = is_down
		elif websocket == self.player_right.channel:
			self.game.player_right.keys[key] = is_down

	def is_full(self):
		return (self.player_left is not None and self.player_right is not None)

	def start_game(self, channel_layer):
		if self.is_full() and not self.game.is_running:
			self.channel_layer = channel_layer
			self.game.start()

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
		if not self.player_left:
			self.player_left = User(user, channel, "Connected")
			self.logger.info(f"Creating user for player left {self.player_left.user.username}")
		elif not self.player_right:
			self.player_right = User(user, channel, "Connected")
			self.logger.info(f"Creating user for player right {self.player_right.user.username}")
		else:
			raise Exception("Error : assign player when two player were in a game")

	async def broadcast_state(self):
		if not self.channel_layer:
			return

		events = []
		if self.scored:
			events.append({"type": "score", "position": vars(self.game.scorePos)})
			self.scored = False

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
		await self.channel_layer.group_send(self.room_id, state)
