import asyncio
import websockets
import json
import time
import random
import math

class Vector2D:
	def __init__(self, x=0.0, y=0.0, z=0.0):
		self.x = x
		self.y = y
		self.z = z

class Ball:
	def __init__(self):
		self.position = Vector2D(0, -3, -15)
		self.velocity = Vector2D()
		self.speed = 30
		self.radius = 0.5
		self.bounds = GameBounds()
		self.min_angle = 15
		self.max_angle = 75

	def start(self):
		direction = random.choice([-1, 1])

		# Get random angle between -5 and 5 degrees
		angle = random.uniform(-5, 5)
		angle_rad = math.radians(angle)

		# Calculate velocity components using trigonometry
		self.velocity.x = direction * self.speed * math.cos(angle_rad)
		self.velocity.y = self.speed * math.sin(angle_rad)

		# Reset position to center
		self.position = Vector2D(0, -3, -15)

	def bounce_wall(self, is_top):
		self.velocity.y *= -1
		if is_top:
			self.position.y = self.bounds.top.y - self.radius  # top boundary
		else:
			self.position.y = self.bounds.bottom.y + self.radius  # bottom boundary

	def bounce_paddle(self, paddle_x, paddle_y):
		relative_intersect_y = paddle_y - self.position.y
		normalized_intersect = relative_intersect_y / (4.0/2) #4.0 is the paddle height
		bounce_angle = normalized_intersect * math.radians(30)

		if paddle_x < self.position.x:  # Right paddle
			self.velocity.x = self.speed * math.cos(bounce_angle)
		else:  # Left paddle
			self.velocity.x = -self.speed * math.cos(bounce_angle)
		self.velocity.y = -self.speed * math.sin(bounce_angle)


	def update(self, delta_time):
		self.position.x += self.velocity.x * delta_time
		self.position.y += self.velocity.y * delta_time

class Player:
	def __init__(self, name, rank, position, score, keys, websocket, game_bounds):
		self.name = name
		self.rank = rank
		self.position = position
		self.score = score
		self.keys = keys
		self.websocket = websocket
		self.paddle_speed = 24
		self.paddle_height = 4.0
		self.paddle_thickness = 0.8
		self.game_bounds = game_bounds

	def update(self, delta_time):
		movement = 0
		if self.keys["ArrowUp"]:
			movement += 1
		if self.keys["ArrowDown"]:
			movement -= 1

		if movement != 0:
			movement_amount = movement * self.paddle_speed * delta_time
			self.position.y += movement_amount
			self.position.y = min(max(self.position.y,
									self.game_bounds.bottom.y + self.paddle_height/2 + 0.1),
								self.game_bounds.top.y - self.paddle_height/2 - 0.1)

class GameBounds:
	def __init__(self):
		self.top = Vector2D(0, 7, -15)
		self.bottom = Vector2D(0, -13, -15)
		self.left = Vector2D(-20, -3, -15)
		self.right = Vector2D(20, -3, -15)

class GameState:
	def __init__(self):
		self.bounds = GameBounds()
		self.player_left = Player("Player 1", 1500,
								Vector2D(self.bounds.left.x + 2, -3, -15), 0,
								{"ArrowUp": False, "ArrowDown": False},
								None, self.bounds)
		self.player_right = Player("Player 2", 2000,
								 Vector2D(self.bounds.right.x - 2, -3, -15), 0,
								 {"ArrowUp": False, "ArrowDown": False},
								 None, self.bounds)
		self.ball = Ball()
		self.game_loop_task = None
		self.last_update_time = time.time()

	def update(self):
		current_time = time.time()
		delta_time = current_time - self.last_update_time
		self.last_update_time = current_time

		self.player_left.update(delta_time)
		self.player_right.update(delta_time)
		self.ball.update(delta_time)
		self.check_collisions()

	def check_collisions(self):
		ball = self.ball
		ball_pos = ball.position

		# Wall collisions
		if ball_pos.y >= self.bounds.top.y - ball.radius:
			ball.bounce_wall(True)
		elif ball_pos.y <= self.bounds.bottom.y + ball.radius:
			ball.bounce_wall(False)

		# Paddle collisions
		paddle_hit = False

		# Right paddle collision
		if (ball_pos.x + ball.radius >= self.player_right.position.x - self.player_right.paddle_thickness/2 and
			ball_pos.x - ball.radius <= self.player_right.position.x + self.player_right.paddle_thickness/2):
			if abs(ball_pos.y - self.player_right.position.y) <= self.player_right.paddle_height/2 + ball.radius:
				ball.bounce_paddle(self.player_right.position.x, self.player_right.position.y)
				paddle_hit = True
				print("Hit right paddle")

		# Left paddle collision
		elif (ball_pos.x - ball.radius <= self.player_left.position.x + self.player_left.paddle_thickness/2 and
			  ball_pos.x + ball.radius >= self.player_left.position.x - self.player_left.paddle_thickness/2):
			if abs(ball_pos.y - self.player_left.position.y) <= self.player_left.paddle_height/2 + ball.radius:
				ball.bounce_paddle(self.player_left.position.x, self.player_left.position.y)
				paddle_hit = True
				print("Hit left paddle")

		# Scoring
		if not paddle_hit:
			if ball_pos.x >= self.bounds.right.x:
				self.player_left.score += 1
				ball.start()
				print("Left player scores!")
			elif ball_pos.x <= self.bounds.left.x:
				self.player_right.score += 1
				ball.start()
				print("Right player scores!")

	def handle_key_event(self, websocket, key, is_down):
		if websocket == self.player_left.websocket:
			self.player_left.keys[key] = is_down
		elif websocket == self.player_right.websocket:
			self.player_right.keys[key] = is_down

	def is_full(self):
		return (self.player_left.websocket is not None and
				self.player_right.websocket is not None)

async def broadcast_game_state(game):
	update = {
		"type": "update",
		"data": {
			"player": {
				"left": {
					"position": {
						"x": game.player_left.position.x,
						"y": game.player_left.position.y,
						"z": game.player_left.position.z
					},
					"score": game.player_left.score
				},
				"right": {
					"position": {
						"x": game.player_right.position.x,
						"y": game.player_right.position.y,
						"z": game.player_right.position.z
					},
					"score": game.player_right.score
				}
			},
			"ball": {
				"position": {
					"x": game.ball.position.x,
					"y": game.ball.position.y,
					"z": game.ball.position.z
				}
			}
		}
	}

	websockets_to_remove = []
	for player in [game.player_left, game.player_right]:
		if player.websocket:
			try:
				await player.websocket.send(json.dumps(update))
			except websockets.exceptions.ConnectionClosed:
				websockets_to_remove.append(player.websocket)

	for ws in websockets_to_remove:
		if game.player_left.websocket == ws:
			game.player_left.websocket = None
		if game.player_right.websocket == ws:
			game.player_right.websocket = None

async def game_loop(game):
	try:
		while True:
			game.update()
			await broadcast_game_state(game)
			await asyncio.sleep(1/60)  # 60 FPS
	except Exception as e:
		print(f"Error in game loop: {e}")

class GameManager:
	def __init__(self):
		self.current_game = None

	def get_or_create_game(self):
		if (not self.current_game or
			(not self.current_game.player_left.websocket and
			 not self.current_game.player_right.websocket)):
			self.current_game = GameState()
		return self.current_game

	def assign_player(self, websocket):
		game = self.get_or_create_game()

		if game.player_left.websocket is None:
			game.player_left.websocket = websocket
			print("Assigned player to LEFT side")
			return game, "left"
		elif game.player_right.websocket is None:
			game.player_right.websocket = websocket
			print("Assigned player to RIGHT side")
			return game, "right"

		return None, None

game_manager = GameManager()

async def handle_client(websocket):
	game = None
	player_side = None

	try:
		async for message in websocket:
			try:
				data = json.loads(message)
				print(f"Received message from {player_side}: {message}")

				if data["type"] == "init":
					game, player_side = game_manager.assign_player(websocket)

					if game and player_side:
						response = {
							"type": "init_response",
							"data": {
								"positions": {
									"player_left": {
										"x": game.player_left.position.x,
										"y": game.player_left.position.y,
										"z": game.player_left.position.z
									},
									"player_right": {
										"x": game.player_right.position.x,
										"y": game.player_right.position.y,
										"z": game.player_right.position.z
									},
									"ball": {
										"x": game.ball.position.x,
										"y": game.ball.position.y,
										"z": game.ball.position.z
									},
									"borders": {
										"top": {
											"x": game.bounds.top.x,
											"y": game.bounds.top.y,
											"z": game.bounds.top.z
										},
										"bottom": {
											"x": game.bounds.bottom.x,
											"y": game.bounds.bottom.y,
											"z": game.bounds.bottom.z
										},
										"left": {
											"x": game.bounds.left.x,
											"y": game.bounds.left.y,
											"z": game.bounds.left.z
										},
										"right": {
											"x": game.bounds.right.x,
											"y": game.bounds.right.y,
											"z": game.bounds.right.z
										}
									}
								},
								"player": {
									"left": {
										"name": game.player_left.name,
										"rank": game.player_left.rank
									},
									"right": {
										"name": game.player_right.name,
										"rank": game.player_right.rank
									}
								},
								"side": player_side
							}
						}
						await websocket.send(json.dumps(response))

						if game.is_full() and game.game_loop_task is None:
							print("Starting game loop - both players connected")
							game.ball.start()
							game.game_loop_task = asyncio.create_task(game_loop(game))

				elif data["type"] in ["keydown", "keyup"] and game:
					game.handle_key_event(websocket, data["key"], data["type"] == "keydown")

			except json.JSONDecodeError:
				print(f"Invalid JSON received: {message}")

	except websockets.exceptions.ConnectionClosed:
		print(f"Client disconnected ({player_side})")
		if game:
			if game.player_left.websocket == websocket:
				game.player_left.websocket = None
			elif game.player_right.websocket == websocket:
				game.player_right.websocket = None

			if game.game_loop_task and not game.is_full():
				game.game_loop_task.cancel()
				game.game_loop_task = None

async def main():
	async with websockets.serve(handle_client, "localhost", 8765):
		print("Server started on ws://localhost:8765")
		await asyncio.Future()

if __name__ == "__main__":
	asyncio.run(main())
