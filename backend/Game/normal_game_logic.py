import asyncio
import time
import random
import math
import logging
from .game_helper_class import BounceMethods, MovementMethod, Vector2D, DEFAULT_BALL_POS, RIGHT_SIDE_DIR, LEFT_SIDE_DIR, DEFAULT_BALL_ACCELERATION, DEFAULT_BALL_BASE_SPEED, DEFAULT_PLAYER_SPEED, random_angle

class Ball:
	def __init__(self):
		self.position = DEFAULT_BALL_POS
		self.velocity = Vector2D()
		self.baseSpeed = DEFAULT_BALL_BASE_SPEED
		self.speed = self.baseSpeed
		self.maxSpeedMult = 0.8
		self.reaction_time = 0.1
		self.maxSpeed = self.calculate_max_safe_speed(self.maxSpeedMult)
		self.radius = 0.5
		self.bounds = GameBounds()
		self.countdown = 2
		self.visible = False
		self.is_moving = False
		self.acceleration = DEFAULT_BALL_ACCELERATION
		self.lastHitter = "NONE"

	def calculate_max_safe_speed(self, maxSpeedMult):
		bounds = GameBounds()
		court_height = bounds.top.y - bounds.bottom.y
		court_width = bounds.right.x - bounds.left.x
		paddle_speed = 35
		max_paddle_travel = court_height - 5.006
		paddle_travel_time = max_paddle_travel / paddle_speed
		ball_travel_distance = court_width
		max_safe_speed = ball_travel_distance / (paddle_travel_time + self.reaction_time)
		logging.getLogger('game').info(f"Max safe speed: {max_safe_speed}")
		return (max_safe_speed)

	def BounceWall(self, is_top):
		ball = self
		ball.velocity.y *= -1
		if is_top:
			ball.position.y = ball.bounds.top.y - ball.radius
		else:
			ball.position.y = ball.bounds.bottom.y + ball.radius

	def BouncePaddle(self, paddle_x, paddle_y):
		ball = self
		relative_intersect_y = paddle_y - ball.position.y
		normalized_intersect = relative_intersect_y / (4.0/2)
		bounce_angle = normalized_intersect * math.radians(45)

		if paddle_x < ball.position.x:  # Right paddle
			ball.velocity.x = ball.speed * math.cos(bounce_angle)
		else:  # Left paddle
			ball.velocity.x = -ball.speed * math.cos(bounce_angle)
		ball.velocity.y = -ball.speed * math.sin(bounce_angle)

		ball.speed += ball.acceleration
		if (ball.speed >= ball.maxSpeed):
			ball.speed = ball.maxSpeed

	def predict_trajectory(self):
		if not self.is_moving:
			return []
		points = []
		sim_pos = Vector2D(self.position.x, self.position.y, self.position.z)
		sim_vel = Vector2D(self.velocity.x, self.velocity.y, self.velocity.z)

		for _ in range(200):
			points.append(Vector2D(sim_pos.x, sim_pos.y, sim_pos.z))
			next_x = sim_pos.x + sim_vel.x * 0.016  # 0.016 is roughly 1 frame at 60fps
			next_y = sim_pos.y + sim_vel.y * 0.016
			if next_y >= self.bounds.top.y - self.radius or next_y <= self.bounds.bottom.y + self.radius:
				sim_vel.y *= -1
			sim_pos.x = next_x
			sim_pos.y = next_y
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

	def start_movement(self):
		self.is_moving = True
		self.visible = True

	def update(self, delta_time):
		if self.countdown > 0:
			self.countdown -= delta_time
			if self.countdown <= 0:
				self.start_movement()



class Player:
	def __init__(self, position, score, keys, game_bounds):
		self.position = position
		self.score = score
		self.keys = keys
		self.paddle_speed = 35
		self.paddle_height = 5.006
		self.paddle_thickness = 0.8
		self.game_bounds = game_bounds
		self.startPos = Vector2D(0, 0, 0)

	def update(self, delta_time):
		movement = 0
		if self.keys["ArrowUp"] or self.keys["W"]:
			movement = 1
		if self.keys["ArrowDown"] or self.keys["S"]:
			movement = -1

		movement_amount = movement * self.paddle_speed * delta_time
		self.position.y += movement_amount
		self.position.y = min(max(self.position.y,
								self.game_bounds.bottom.y + self.paddle_height/2 + 0.1),
							self.game_bounds.top.y - self.paddle_height/2 - 0.1)

class GameBounds:
	def __init__(self):
		self.top = Vector2D(0, 10.56+10.5, -15)
		self.bottom = Vector2D(0, -17.89+10.5, -15)
		self.left = Vector2D(-20.45, -3.70+10.5, -15)
		self.right = Vector2D(20.42, -3.70+10.5, -15)

class ClassicGameInstance:
	def __init__(self, broadcast_fun, game_end_fun, achievement_checker_fun, tournament, local):
		self.bounds = GameBounds()
		self.player_left = Player(Vector2D(self.bounds.left.x + 2, -3+10.5, -15), 0,{"ArrowUp": False, "ArrowDown": False, "W" : False, "S" : False}, self.bounds)
		self.player_right = Player(Vector2D(self.bounds.right.x - 2, -3+10.5, -15), 0,{"ArrowUp": False, "ArrowDown": False, "W" : False, "S" : False}, self.bounds)
		self.ball = Ball()
		self.local = local
		self.tournament = tournament
		self.paused = False
		self.ended = False
		self.scorer = None
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
		self.achievement_checker_fun = achievement_checker_fun

	async def check_collisions(self):
		ball = self.ball
		ball_pos = ball.position
		paddle_hit = False

		if ball_pos.y >= self.bounds.top.y - ball.radius:
			self.ball.BounceWall(True)
		elif ball_pos.y <= self.bounds.bottom.y + ball.radius:
			self.ball.BounceWall(False)

		right_paddle = self.player_right
		if (ball_pos.x <= right_paddle.position.x + right_paddle.paddle_thickness/2 + ball.radius and
			ball_pos.x >= right_paddle.position.x - right_paddle.paddle_thickness/2 - ball.radius):
			if (abs(ball_pos.y - right_paddle.position.y) <=
				right_paddle.paddle_height/2 + ball.radius):
					if ball.velocity.x > 0:
						ball.position.x = right_paddle.position.x - right_paddle.paddle_thickness/2 - ball.radius
						self.ball.BouncePaddle(right_paddle.position.x, right_paddle.position.y)
						self.logger.info(self.ball.speed)
						ball.lastHitter = "RIGHT"
						paddle_hit = True

		left_paddle = self.player_left
		if (ball_pos.x >= left_paddle.position.x - left_paddle.paddle_thickness/2 - ball.radius and
			ball_pos.x <= left_paddle.position.x + left_paddle.paddle_thickness/2 + ball.radius):
				if (abs(ball_pos.y - left_paddle.position.y) <=
				left_paddle.paddle_height/2 + ball.radius):
					if ball.velocity.x < 0:
						ball.position.x = left_paddle.position.x + left_paddle.paddle_thickness/2 + ball.radius
						self.ball.BouncePaddle(left_paddle.position.x, left_paddle.position.y)
						self.logger.info(self.ball.speed)

						ball.lastHitter = "LEFT"  # Add this line
						paddle_hit = True

		if not paddle_hit:
			if ball_pos.x >= self.bounds.right.x:
					await self.on_score("LEFT")
			elif ball_pos.x <= self.bounds.left.x:
					await self.on_score("RIGHT")


	async def on_score(self, winner):
		if winner == "LEFT":
			self.player_left.score += 1
			self.scorePos = Vector2D(self.ball.position.x, self.ball.position.y, self.ball.position.z)
			self.ball.start(LEFT_SIDE_DIR, DEFAULT_BALL_POS)
			self.ball.lastHitter = "RIGHT"
			self.scorer = "LEFT"
		elif winner == "RIGHT":
			self.player_right.score += 1
			self.scorePos = Vector2D(self.ball.position.x, self.ball.position.y, self.ball.position.z)
			self.ball.start(RIGHT_SIDE_DIR, DEFAULT_BALL_POS)
			self.ball.lastHitter = "LEFT"
			self.scorer = "RIGHT"
		self.announceEvent = True
		self.ball.visible = False
		self.ball.is_moving = False
		self.ball.countdown = 2
		await self.achievement_checker_fun()
		self.scored = True

		if (self.check_winner(winner)):
			await self.on_game_end(winner)

	def check_winner(self, winner):
		score_left = self.player_left.score
		score_right = self.player_right.score

		if (winner == "LEFT"):
			if (self.tournament):
				if (score_left >= self.maxScore):
					return True
			else:
				if ((score_left >= self.maxScore and score_right <= (score_left - 2))
					or score_left >= self.maxScoreLimit):
					return True

		elif (winner == "RIGHT"):
			if (self.tournament):
				if (score_right >= self.maxScore):
					return True
			else:
				if ((score_right >= self.maxScore and score_left <= (score_right - 2))
					or score_right >= self.maxScoreLimit):
					return True
		return False

	async def forfeit(self, side):
		if (side == "LEFT"):
			self.logger.info("Player left forfeited")
			await self.on_game_end("RIGHT")
		else:
			self.logger.info("Player right forfeited")
			await self.on_game_end("LEFT")

	async def on_game_end(self, winner):
		self.logger.info("Game ended")
		self.stop()
		self.winner = winner
		self.ended = True
		await self.achievement_checker_fun()
		await self.game_end_fun()

	def start(self):
		self.is_running = True
		self.last_update_time = time.time()
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

						if self.ball.is_moving:
							self.ball.position.x += self.ball.velocity.x * current_step
							self.ball.position.y += self.ball.velocity.y * current_step

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
