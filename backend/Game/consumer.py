from channels.generic.websocket import AsyncWebsocketConsumer
from .game_instance import GameInstance  # Add this import
from channels.layers import get_channel_layer
import json

class GameManager:
	def __init__(self):
		self.games = {}
		self.current_room_id = 0

	def create_game(self):
		self.current_room_id += 1
		room_id = f"game_{self.current_room_id}"
		self.games[room_id] = GameInstance(room_id)
		return room_id

	def get_available_game(self):
		# Find a non-full game or create new one
		for game_id, game in self.games.items():
			if not game.is_full():
				return game_id
		return self.create_game()

	def get_game(self, game_id):
		return self.games.get(game_id)

game_manager = GameManager()

class GameConsumer(AsyncWebsocketConsumer):
	async def connect(self):
	 # Initialize game-specific attributes
		self.game = None
		self.game_id = None
		self.player_side = None

		# Get game instance
		self.game_id = game_manager.get_available_game()
		self.game = game_manager.get_game(self.game_id)

	 # Use channel layer
		await self.channel_layer.group_add(
	  self.game_id,
	  self.channel_name
		)
		await self.accept()

		self.player_side = self.game.assign_player(self)

		# Send initial game state
		init_response = {
		  "type": "init_response",
		  "data": {
				"room_id": self.game_id,
				"side": self.player_side,
				"game_started": self.game.is_full(),  # Add this line
				"positions": {
					 "player_left": vars(self.game.player_left.position),
					 "player_right": vars(self.game.player_right.position),
					 "ball": vars(self.game.ball.position),
					"borders":
						{
							"bottom" : vars(self.game.bounds.bottom),
							"top" : vars(self.game.bounds.top),
							"left" : vars(self.game.bounds.left),
							"right" : vars(self.game.bounds.right),
						}
				},
				"player": {
					 "left": {
						  "name": self.game.player_left.name,
						  "rank": self.game.player_left.rank,
						  "score": self.game.player_left.score
					 },
					 "right": {
						  "name": self.game.player_right.name,
						  "rank": self.game.player_right.rank,
						  "score": self.game.player_right.score
					 }
				}
		  }
	 }
		await self.send(text_data=json.dumps(init_response))

		if self.game.is_full():
		  # Notify all players that game is starting
			start_message = {
				"type": "game_start",
				"data": {
					 "message": "Game is starting!"
				}
			}
			await self.channel_layer.group_send(
				self.game_id,
				{
					 "type": "game_message",
					 "message": start_message
				}
		  	)
			self.game.start_game(self.channel_layer)

	async def game_message(self, event):
	 # Send message to WebSocket
		await self.send(text_data=json.dumps(event["message"]))

	async def disconnect(self, close_code):
		if hasattr(self, 'game'):
			if self.game.player_left.websocket == self:
				self.game.player_left.websocket = "Disconnected"
			elif self.game.player_right.websocket == self:
				self.game.player_right.websocket = "Disconnected"

			self.game.stop_game()

			await self.channel_layer.group_discard(
				self.game_id,
				self.channel_name
			)

	async def receive(self, text_data):
		try:
			data = json.loads(text_data)
			print(f"Received message: {data}")  # Debug log

			if data["type"] in ["keydown", "keyup"]:
				self.game.handle_key_event(
					self,
					data["key"],
					data["type"] == "keydown"
				)

				# Optionally send immediate feedback
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

	async def game_update(self, event):
		await self.send(text_data=json.dumps({
		"type": "game_update",
		"data": event["data"]
	}))
