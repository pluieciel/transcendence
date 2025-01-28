import asyncio
import time
import random
import math
import logging
import threading

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
		self.maxSpeedMult = 0.7
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

		return (max_safe_speed * self.maxSpeedMult)

	def predict_trajectory(self):
		if not self.is_moving:
			return []

		points = []
		sim_pos = Vector2D(self.position.x, self.position.y, self.position.z)
		sim_vel = Vector2D(self.velocity.x, self.velocity.y, self.velocity.z)

		for _ in range(200):  # Limit the number of points to prevent infinite loops
			# Add current position to points
			points.append(Vector2D(sim_pos.x, sim_pos.y, sim_pos.z))

			# Simulate next position
			next_x = sim_pos.x + sim_vel.x * 0.016  # 0.016 is roughly 1 frame at 60fps
			next_y = sim_pos.y + sim_vel.y * 0.016

			# Check for wall collisions
			if next_y >= self.bounds.top.y - self.radius or next_y <= self.bounds.bottom.y + self.radius:
				sim_vel.y *= -1

			# Update simulated position
			sim_pos.x = next_x
			sim_pos.y = next_y

			# Stop if we reach the side boundaries
			if sim_pos.x <= self.bounds.left.x or sim_pos.x >= self.bounds.right.x:
				break

		return points

	def start(self, startDir, ballPos):
		direction = startDir
		angle = random.uniform(-5, 5)
		angle_rad = math.radians(angle)

		self.velocity = Vector2D()
		self.speed = self.baseSpeed
		self.velocity.x = direction * self.speed * math.cos(angle_rad)
		self.velocity.y = self.speed * math.sin(angle_rad)
		self.position = Vector2D(ballPos.x, ballPos.y, ballPos.z)

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
		if (self.speed >= self.maxSpeed):
			self.speed = self.maxSpeed

	def update(self, delta_time):
		if self.countdown > 0:
			self.countdown -= delta_time
			if self.countdown <= 0:
				self.start_movement()

		#if self.is_moving:
		#	self.position.x += self.velocity.x * delta_time
		#	self.position.y += self.velocity.y * delta_time

class Player:
	def __init__(self, position, score, keys, game_bounds):
		self.position = position
		self.score = score
		self.keys = keys
		self.paddle_speed = 35
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
		self.top = Vector2D(0, 10.56, -15)
		self.bottom = Vector2D(0, -17.89, -15)
		self.left = Vector2D(-20.45, -3.70, -15)
		self.right = Vector2D(20.42, -3.70, -15)

class NormalGameInstance:
	def __init__(self, broadcast_fun, game_end_fun):
		self.bounds = GameBounds()
		self.player_left = Player(Vector2D(self.bounds.left.x + 2, -3, -15), 0,{"ArrowUp": False, "ArrowDown": False}, self.bounds)
		self.player_right = Player(Vector2D(self.bounds.right.x - 2, -3, -15), 0,{"ArrowUp": False, "ArrowDown": False}, self.bounds)
		self.ball = Ball()
		self.paused = False
		self.ended = False
		self.winner = None
		self.is_running = False
		self.last_update_time = time.time()
		self.loop_task = None
		self.scored = False
		self.scorePos = Vector2D(0,0,0)
		self.maxScore = 10
		self.maxScoreLimit = 50
		self.broadcast_function = broadcast_fun
		self.game_end_fun = game_end_fun
		self.logger = logging.getLogger('game')

	async def check_collisions(self):
		ball = self.ball
		ball_pos = ball.position
		paddle_hit = False

		# Wall collisions
		if ball_pos.y >= self.bounds.top.y - ball.radius:
			ball.bounce_wall(True)
		elif ball_pos.y <= self.bounds.bottom.y + ball.radius:
			ball.bounce_wall(False)

		# Right paddle collision
		right_paddle = self.player_right
		if (ball_pos.x <= right_paddle.position.x + right_paddle.paddle_thickness/2 + ball.radius and
			ball_pos.x >= right_paddle.position.x - right_paddle.paddle_thickness/2 - ball.radius):

			# Vertical collision check
			if (abs(ball_pos.y - right_paddle.position.y) <=
				right_paddle.paddle_height/2 + ball.radius):

				# Prevent ball from getting stuck inside paddle
				if ball.velocity.x > 0:
					ball.position.x = right_paddle.position.x - right_paddle.paddle_thickness/2 - ball.radius

				ball.bounce_paddle(right_paddle.position.x, right_paddle.position.y)
				paddle_hit = True

		# Left paddle collision
		left_paddle = self.player_left
		if (ball_pos.x >= left_paddle.position.x - left_paddle.paddle_thickness/2 - ball.radius and
			ball_pos.x <= left_paddle.position.x + left_paddle.paddle_thickness/2 + ball.radius):

			# Vertical collision check
			if (abs(ball_pos.y - left_paddle.position.y) <=
				left_paddle.paddle_height/2 + ball.radius):

				# Prevent ball from getting stuck inside paddle
				if ball.velocity.x < 0:
					ball.position.x = left_paddle.position.x + left_paddle.paddle_thickness/2 + ball.radius

				ball.bounce_paddle(left_paddle.position.x, left_paddle.position.y)
				paddle_hit = True

		if not paddle_hit:
			if ball_pos.x >= self.bounds.right.x:
				await self.on_score("LEFT")
			elif ball_pos.x <= self.bounds.left.x:
				await self.on_score("RIGHT")

	async def on_score(self, winner):
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
		if (self.check_winner(winner)):
			await self.on_game_end(winner)

	def check_winner(self, winner):
		score_left = self.player_left.score
		score_right = self.player_right.score

		if (winner == "LEFT"):
			if ((score_left >= self.maxScore and score_right <= (score_left - 2))
				or score_left >= self.maxScoreLimit):
				return True

		elif (winner == "RIGHT"):
			if ((score_right >= self.maxScore and score_left <= (score_right - 2))
				or score_right >= self.maxScoreLimit):
				return True
		return False

	async def on_game_end(self, winner):
		self.logger.info("Game ended")
		self.stop()
		self.winner = winner
		self.ended = True
		await self.game_end_fun()

	def start(self):
		self.is_running = True
		self.ball.start(random.choice([LEFT_SIDE_DIR, RIGHT_SIDE_DIR]), DEFAULT_BALL_POS)
		self.loop_task = asyncio.create_task(self.game_loop())

	def stop(self):
		self.is_running = False

	async def game_loop(self):
		try:
			while self.is_running:
				current_time = time.time()
				delta_time = current_time - self.last_update_time
				self.last_update_time = current_time

				if not self.paused:
					self.player_left.update(delta_time)
					self.player_right.update(delta_time)
					self.ball.update(delta_time)

					remaining_time = delta_time
					step_size = 1/240
					#accumulated_step = 0
					while remaining_time > 0:
						current_step = min(step_size, remaining_time)
						#accumulated_step += current_step

						if self.ball.is_moving: #and accumulated_step >= 0.016:
							self.ball.position.x += self.ball.velocity.x * current_step #* accumulated_step
							self.ball.position.y += self.ball.velocity.y * current_step #* accumulated_step
							#accumulated_step = 0

						await (self.check_collisions())

						remaining_time -= current_step
					try:
						if (self.is_running):
							await (self.broadcast_function())
					except Exception as e:
						logging.getLogger('game').info(f"Error Broadcast : {e}")
						pass
				await asyncio.sleep(max(0, 1/60 - (time.time() - current_time)))  # 60 FPS

		except asyncio.CancelledError:
			print(f"Game stopped")
		except Exception as e:
			print(f"Error in game loop: {e}")
