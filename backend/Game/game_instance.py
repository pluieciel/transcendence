import asyncio
import time
import random
import math

RIGHT_SIDE_DIR = 1
LEFT_SIDE_DIR = -1

class Vector2D:
	def __init__(self, x=0.0, y=0.0, z=0.0):
		self.x = x
		self.y = y
		self.z = z

DEFAULT_BALL_POS = Vector2D(0, -3, -15)

class Ball:
	def __init__(self):
		self.position = DEFAULT_BALL_POS
		self.velocity = Vector2D()
		self.baseSpeed = 30
		self.speed = self.baseSpeed
		self.maxSpeedMult = 0.8
		self.maxSpeed = self.calculate_max_safe_speed(self.maxSpeedMult)
		self.radius = 0.5
		self.bounds = GameBounds()
		self.countdown = 5
		self.visible = False
		self.is_moving = False
		self.acceleration = 1.2


	def calculate_max_safe_speed(self, maxSpeedMult):
		bounds = GameBounds()
		court_height = bounds.top.y - bounds.bottom.y
		court_width = bounds.right.x - bounds.left.x
		paddle_speed = 24
		max_paddle_travel = court_height - 4
		paddle_travel_time = max_paddle_travel / paddle_speed
		ball_travel_distance = math.sqrt(court_width**2 + court_height**2)
		max_safe_speed = ball_travel_distance / paddle_travel_time

		return max_safe_speed * self.maxSpeedMult

	def start(self, startDir, ballPos):
		direction = startDir
		angle = random.uniform(-5, 5)
		angle_rad = math.radians(angle)

		self.speed = self.baseSpeed
		self.velocity.x = direction * self.speed * math.cos(angle_rad)
		self.velocity.y = self.speed * math.sin(angle_rad)
		self.position = ballPos

	def bounce_wall(self, is_top):
		self.velocity.y *= -1
		if is_top:
			self.position.y = self.bounds.top.y - self.radius
		else:
			self.position.y = self.bounds.bottom.y + self.radius

	def start_movement(self):
		self.is_moving = True
		self.visible = True

	def bounce_paddle(self, paddle_x, paddle_y):
		relative_intersect_y = paddle_y - self.position.y
		normalized_intersect = relative_intersect_y / (4.0/2)
		bounce_angle = normalized_intersect * math.radians(45)

		if paddle_x < self.position.x:  # Right paddle
			self.velocity.x = self.speed * math.cos(bounce_angle)
		else:  # Left paddle
			self.velocity.x = -self.speed * math.cos(bounce_angle)
		self.velocity.y = -self.speed * math.sin(bounce_angle)

		self.speed += self.acceleration
		print(self.speed)
		if (self.speed >= self.maxSpeed):
			self.speed = self.maxSpeed

	def update(self, delta_time):
		if self.countdown > 0:
			self.countdown -= delta_time
			if self.countdown <= 0:
				self.start_movement()

		if self.is_moving:
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
		self.startPos = Vector2D(0, 0, 0)

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

class GameInstance:
	def __init__(self, room_id):
		self.room_id = room_id
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
		self.last_update_time = time.time()
		self.is_running = False
		self.loop_task = None
		self.channel_layer = None
		self.scored = False
		self.scorePos = Vector2D(0,0,0)

	def check_collisions(self):
		ball = self.ball
		ball_pos = ball.position
		paddle_hit = False

		if ball_pos.y >= self.bounds.top.y - ball.radius:
			ball.bounce_wall(True)
		elif ball_pos.y <= self.bounds.bottom.y + ball.radius:
			ball.bounce_wall(False)

		if (ball_pos.x + ball.radius >= self.player_right.position.x - self.player_right.paddle_thickness/2 and
			ball_pos.x - ball.radius <= self.player_right.position.x + self.player_right.paddle_thickness/2):
			if abs(ball_pos.y - self.player_right.position.y) <= self.player_right.paddle_height/2 + ball.radius:
				ball.bounce_paddle(self.player_right.position.x, self.player_right.position.y)
				paddle_hit = True

		elif (ball_pos.x - ball.radius <= self.player_left.position.x + self.player_left.paddle_thickness/2 and
			  ball_pos.x + ball.radius >= self.player_left.position.x - self.player_left.paddle_thickness/2):
			if abs(ball_pos.y - self.player_left.position.y) <= self.player_left.paddle_height/2 + ball.radius:
				ball.bounce_paddle(self.player_left.position.x, self.player_left.position.y)
				paddle_hit = True

		if not paddle_hit:
			if ball_pos.x >= self.bounds.right.x:
				self.on_score("LEFT")
			elif ball_pos.x <= self.bounds.left.x:
				self.on_score("RIGHT")

	def on_score(self, winner):
		if winner == "LEFT":
			self.player_left.score += 1
			self.scorePos = Vector2D(self.bounds.right.x, self.ball.position.y, self.ball.position.z)
			self.ball.start(LEFT_SIDE_DIR, Vector2D(self.player_right.position.x - 1, self.player_right.position.y, -15))
		elif winner == "RIGHT":
			self.player_right.score += 1
			self.scorePos = Vector2D(self.bounds.left.x, self.ball.position.y, self.ball.position.z)
			self.ball.start(RIGHT_SIDE_DIR, Vector2D(self.player_left.position.x + 1, self.player_left.position.y, -15))
		self.ball.visible = False
		self.ball.is_moving = False
		self.ball.countdown = 1
		self.scored = True

	def handle_key_event(self, websocket, key, is_down):
		print(f"Handling key event: {key} {is_down}")
		if websocket == self.player_left.websocket:
			self.player_left.keys[key] = is_down
		elif websocket == self.player_right.websocket:
			self.player_right.keys[key] = is_down

	def assign_player(self, consumer):
		if not self.player_left.websocket:
			self.player_left.websocket = consumer
			return 'left'
		elif not self.player_right.websocket:
			self.player_right.websocket = consumer
			return 'right'
		return None

	def is_full(self):
		return (self.player_left.websocket is not None and
				self.player_right.websocket is not None)

	def start_game(self, channel_layer):
		if self.is_full() and not self.is_running:
			self.channel_layer = channel_layer
			self.is_running = True
			self.ball.start(random.choice([LEFT_SIDE_DIR, RIGHT_SIDE_DIR]), DEFAULT_BALL_POS)
			self.loop_task = asyncio.create_task(self.game_loop())

	def stop_game(self):
		self.is_running = False
		if self.loop_task:
			self.loop_task.cancel()

	async def game_loop(self):
		try:
			while self.is_running:
				current_time = time.time()
				delta_time = current_time - self.last_update_time
				self.last_update_time = current_time

				self.player_left.update(delta_time)
				self.player_right.update(delta_time)
				self.ball.update(delta_time)
				self.check_collisions()

				await self.broadcast_state()

				await asyncio.sleep(1/60)  # 60 FPS

		except asyncio.CancelledError:
			print(f"Game {self.room_id} stopped")
		except Exception as e:
			print(f"Error in game loop: {e}")

	def update(self):
		current_time = time.time()
		delta_time = current_time - self.last_update_time
		self.last_update_time = current_time

		self.player_left.update(delta_time)
		self.player_right.update(delta_time)
		self.ball.update(delta_time)
		self.check_collisions()

	async def broadcast_state(self):
		if not self.channel_layer:
			return

		events = []
		if (self.scored):
			events.append({"type":"score", "position" : vars(self.scorePos)})
			print("Score")
			self.scored = False

		state = {
			"type": "game.update",
			"data": {
				"player": {
					"left": {
						"position": vars(self.player_left.position),
						"score": self.player_left.score
					},
					"right": {
						"position": vars(self.player_right.position),
						"score": self.player_right.score
					}
				},
				"ball": {
					"position": vars(self.ball.position),
					"visibility" : self.ball.visible
				},
				"events": events
			}

		}

		await self.channel_layer.group_send(self.room_id, state)
