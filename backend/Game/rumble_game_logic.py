import asyncio
import time
import random
import math
import logging
import threading
from abc import ABC, abstractmethod

RIGHT_SIDE_DIR = 1
LEFT_SIDE_DIR = -1

class BounceMethods(ABC):
	@abstractmethod
	def BounceWall(self, ball, is_top):
		pass

	@abstractmethod
	def BouncePaddle(self, ball, paddle_x, paddle_y):
		pass

class MirrorBounce(BounceMethods):
	def BounceWall(self, ball, is_top):
		if is_top:
			ball.position.y = ball.bounds.bottom.y + ball.radius
		else:
			ball.position.y = ball.bounds.top.y - ball.radius

	def BouncePaddle(self, ball, paddle_x, paddle_y):
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

class RandomBounce(BounceMethods):
	def BounceWall(self, ball, is_top):
		# Introduce randomness to the bounce angle
		random_angle = random.uniform(-80, 80)  # Random angle between -80 and 80 degrees
		random_angle_rad = math.radians(random_angle)

		# Reverse the y-velocity and add randomness to the x-velocity
		ball.velocity.y *= -1
		directionX = (ball.velocity.x > 0) * 2 - 1
		ball.velocity.x = abs(ball.speed * math.tan(random_angle_rad)) * directionX
		ball.velocity.normalize()
		ball.velocity.x *= ball.speed
		ball.velocity.y *= ball.speed

		# Ensure the ball stays within bounds
		if is_top:
			ball.position.y = ball.bounds.top.y - ball.radius
		else:
			ball.position.y = ball.bounds.bottom.y + ball.radius

	def BouncePaddle(self, ball, paddle_x, paddle_y):
	 # Introduce randomness to the bounce angle
		random_angle = random.uniform(-80, 80)  # Random angle between -80 and 80 degrees
		random_angle_rad = math.radians(random_angle)

		# Determine the direction of the bounce
		if paddle_x < ball.position.x:
			ball.velocity.x = ball.speed * math.cos(random_angle_rad)
		else:  # Left paddle
			ball.velocity.x = -ball.speed * math.cos(random_angle_rad)
		ball.velocity.y = ball.speed * math.sin(random_angle_rad)
		ball.velocity.normalize()
		ball.velocity.x *= ball.speed
		ball.velocity.y *= ball.speed

		# Increase the ball's speed with acceleration, ensuring it does not exceed the maximum speed
		ball.speed += ball.acceleration
		if ball.speed >= ball.maxSpeed:
			ball.speed = ball.maxSpeed

class NormalBounce(BounceMethods):
	def BounceWall(self, ball, is_top):
		ball.velocity.y *= -1
		if is_top:
			ball.position.y = ball.bounds.top.y - ball.radius
		else:
			ball.position.y = ball.bounds.bottom.y + ball.radius

	def BouncePaddle(self, ball, paddle_x, paddle_y):
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

class MovementMethod(ABC):
	@abstractmethod
	def calculate_movement(self, input_direction: int, speed: float, delta_time: float) -> float:
		pass

class NormalMovements(MovementMethod):
	def calculate_movement(self, input_direction: int, speed: float, delta_time: float) -> float:
		return input_direction * speed * delta_time

class InvertedMovements(MovementMethod):
	def calculate_movement(self, input_direction: int, speed: float, delta_time: float) -> float:
		return -input_direction * speed * delta_time

class IcyMovement(MovementMethod):
	r_speed = 0

	def calculate_movement(self, input_direction: int, speed: float, delta_time: float) -> float:
		drag = speed * 0.03
		logging.getLogger('game').info(f"dir : {input_direction}")
		if (input_direction != 0):
			self.r_speed = speed * input_direction
		else:
			if (self.r_speed > 0):
				self.r_speed -= drag
				if (self.r_speed < 0):
					self.r_speed = 0
				logging.getLogger('game').info(f"r_speed : {self.r_speed}")
			else:
				self.r_speed += drag
				if (self.r_speed > 0):
					self.r_speed = 0
				logging.getLogger('game').info(f"r_speed : {self.r_speed}")
		return self.r_speed * delta_time


class Vector2D:
	def __init__(self, x=0.0, y=0.0, z=0.0):
		self.x = x
		self.y = y
		self.z = z

	def get_magnitude(self):
		return math.sqrt(self.x**2 + self.y**2 + self.z**2)

	def normalize(self):
		magnitude = self.get_magnitude()
		self.x /= magnitude
		self.y /= magnitude
		self.z /= magnitude

DEFAULT_BALL_POS = Vector2D(0, 7.8, -15)
DEFAULT_BALL_ACCELERATION = 1.2
DEFAULT_BALL_BASE_SPEED = 30

class Ball:
	def __init__(self):
		self.position = DEFAULT_BALL_POS
		self.velocity = Vector2D()
		self.baseSpeed = DEFAULT_BALL_BASE_SPEED
		self.speed = self.baseSpeed
		self.maxSpeedMult = 0.7
		self.maxSpeed = self.calculate_max_safe_speed(self.maxSpeedMult)
		self.radius = 0.5
		self.bounds = GameBounds()
		self.countdown = 6
		self.visible = False
		self.is_moving = False
		self.acceleration = DEFAULT_BALL_ACCELERATION
		self.bounce_methods = NormalBounce()
		self.lastHitter = "NONE"

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

DEFAULT_PLAYER_SPEED = 35

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
		self.movement_method = NormalMovements()

	def update(self, delta_time):
		movement = 0
		if self.keys["ArrowUp"]:
			movement += 1
		if self.keys["ArrowDown"]:
			movement -= 1

		movement_amount = self.movement_method.calculate_movement(movement, self.paddle_speed, delta_time)
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

class RumbleGameInstance:
	def __init__(self, broadcast_fun, revert_event_fun, game_end_fun):
		self.bounds = GameBounds()
		self.player_left = Player(Vector2D(self.bounds.left.x + 2, -3+10.5, -15), 0,{"ArrowUp": False, "ArrowDown": False}, self.bounds)
		self.player_right = Player(Vector2D(self.bounds.right.x - 2, -3+10.5, -15), 0,{"ArrowUp": False, "ArrowDown": False}, self.bounds)
		self.ball = Ball()
		self.event = self.get_event()
		self.event.apply()
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
		self.announceEvent = True
		self.revert_event_fun = revert_event_fun

	async def check_collisions(self):
		ball = self.ball
		ball_pos = ball.position
		paddle_hit = False

		if ball_pos.y >= self.bounds.top.y - ball.radius:
			ball.bounce_methods.BounceWall(ball, True)
		elif ball_pos.y <= self.bounds.bottom.y + ball.radius:
			ball.bounce_methods.BounceWall(ball, False)

		right_paddle = self.player_right
		if (ball_pos.x <= right_paddle.position.x + right_paddle.paddle_thickness/2 + ball.radius and
			ball_pos.x >= right_paddle.position.x - right_paddle.paddle_thickness/2 - ball.radius):
			if (abs(ball_pos.y - right_paddle.position.y) <=
				right_paddle.paddle_height/2 + ball.radius):
					if ball.velocity.x > 0:
						ball.position.x = right_paddle.position.x - right_paddle.paddle_thickness/2 - ball.radius
						ball.bounce_methods.BouncePaddle(ball, right_paddle.position.x, right_paddle.position.y)

						if (self.event.name == 'Shrinking Paddles' and self.player_right.paddle_height > 2.25):
							self.player_right.paddle_height *= 0.9
							self.event.action = 'shrinkRight'
						ball.lastHitter = "RIGHT"  # Add this line
						paddle_hit = True

		left_paddle = self.player_left
		if (ball_pos.x >= left_paddle.position.x - left_paddle.paddle_thickness/2 - ball.radius and
			ball_pos.x <= left_paddle.position.x + left_paddle.paddle_thickness/2 + ball.radius):
				if (abs(ball_pos.y - left_paddle.position.y) <=
				left_paddle.paddle_height/2 + ball.radius):
					if ball.velocity.x < 0:
						ball.position.x = left_paddle.position.x + left_paddle.paddle_thickness/2 + ball.radius
						ball.bounce_methods.BouncePaddle(ball, left_paddle.position.x, left_paddle.position.y)

						if (self.event.name == 'Shrinking Paddles' and self.player_left.paddle_height > 2.25):
							self.player_left.paddle_height *= 0.9
							self.event.action = 'shrinkLeft'
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
			self.scorePos = Vector2D(self.bounds.right.x, self.ball.position.y, self.ball.position.z)
			self.ball.start(LEFT_SIDE_DIR, DEFAULT_BALL_POS)
			self.ball.lastHitter = "RIGHT"
		elif winner == "RIGHT":
			self.player_right.score += 1
			self.scorePos = Vector2D(self.bounds.left.x, self.ball.position.y, self.ball.position.z)
			self.ball.start(RIGHT_SIDE_DIR, DEFAULT_BALL_POS)
			self.ball.lastHitter = "LEFT"
		self.event.revert()
		await self.revert_event_fun()
		self.event = self.get_event()
		self.event.apply()
		self.announceEvent = True
		self.ball.visible = False
		self.ball.is_moving = False
		self.ball.countdown = 5
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
		await self.game_end_fun()

	def start(self):
		self.is_running = True
		self.logger.info(f"rumble self : {self}")
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

	def get_event(self):
		events = [
			#InvertedControlsEvent(self),
			#RandomBouncesEvent(self),
			#MirrorBallEvent(self),
			#LightsOutEvent(self),
			#SmokeCloudEvent(self),
			#InfiniteSpeedEvent(self),
			#ReverseBallEvent(self),
			ShrinkingPaddleEvent(self)#,
			#IcyPaddlesEvent(self)
		]
		return random.choice(events)

class GameEvent(ABC):
	def __init__(self, game : RumbleGameInstance):
		self.name = None
		self.description = None
		self.game = game
		self.ball_accel_mult = 1
		self.ball_basespeed_mult = 0.9
		self.player_speed_mult = 1.1
		self.is_active = False
		self.action = 'none'

	def apply(self):
		self.apply_common()
		self.apply_specific()

	def apply_common(self):
		self.game.ball.acceleration *= self.ball_accel_mult
		self.game.ball.baseSpeed *= self.ball_basespeed_mult
		self.game.player_left.paddle_speed *= self.player_speed_mult
		self.game.player_right.paddle_speed *= self.player_speed_mult

	@abstractmethod
	def apply_specific(self):
		pass

	def revert(self):
		self.revert_common()
		self.revert_specific()

	def revert_common(self):
		self.game.ball.acceleration = DEFAULT_BALL_ACCELERATION
		self.game.ball.baseSpeed = DEFAULT_BALL_BASE_SPEED
		self.game.player_left.paddle_speed = DEFAULT_PLAYER_SPEED
		self.game.player_right.paddle_speed = DEFAULT_PLAYER_SPEED

	@abstractmethod
	def revert_specific(self):
		pass

class InvertedControlsEvent(GameEvent):
	def __init__(self, game: RumbleGameInstance):
		self.game = game
		self.name = "Inverted Controls"
		self.description = "Controls are inverted !"
		self.ball_accel_mult = 1
		self.ball_basespeed_mult = 1
		self.player_speed_mult = 1
		self.action = 'none'

	def apply_specific(self):
		self.game.player_left.movement_method = InvertedMovements()
		self.game.player_right.movement_method = InvertedMovements()

	def revert_specific(self):
		self.game.player_left.movement_method = NormalMovements()
		self.game.player_right.movement_method = NormalMovements()


class RandomBouncesEvent(GameEvent):
	def __init__(self, game: RumbleGameInstance):
		self.game = game
		self.name = "Random Bounces"
		self.description = "All bounces from the ball are random !"
		self.ball_accel_mult = 1
		self.ball_basespeed_mult = 0.9
		self.player_speed_mult = 1.1
		self.action = 'none'

	def apply_specific(self):
		self.game.ball.bounce_methods = RandomBounce()

	def revert_specific(self):
		self.game.ball.bounce_methods = NormalBounce()

class MirrorBallEvent(GameEvent):
	def __init__(self, game: RumbleGameInstance):
		self.game = game
		self.name = "Mirror Ball"
		self.description = "The ball teleports to the opposite wall instead of bouncing"
		self.ball_accel_mult = 1
		self.ball_basespeed_mult = 1
		self.player_speed_mult = 1
		self.action = 'none'

	def apply_specific(self):
		self.game.ball.bounce_methods = MirrorBounce()

	def revert_specific(self):
		self.game.ball.bounce_methods = NormalBounce()

class LightsOutEvent(GameEvent):
	def __init__(self, game: RumbleGameInstance):
		self.game = game
		self.name = "Lights Out"
		self.description = "The lights turned off"
		self.ball_accel_mult = 1
		self.ball_basespeed_mult = 1
		self.player_speed_mult = 1

	def apply_specific(self):
		self.action = 'off'

	def revert_specific(self):
		self.action = 'on'


class SmokeCloudEvent(GameEvent):
	def __init__(self, game: RumbleGameInstance):
		self.game = game
		self.name = "SmokeCloud"
		self.action = 'none'
		self.description = "The ball disappears when in the middle of the field !"
		self.ball_accel_mult = 1
		self.ball_basespeed_mult = 1
		self.player_speed_mult = 1

	def apply_specific(self):
		pass

	def revert_specific(self):
		pass

class InfiniteSpeedEvent(GameEvent):
	def __init__(self, game: RumbleGameInstance):
		self.game = game
		self.name = "Random Bounces"
		self.description = "All bounces from the ball are random !"
		self.action = 'none'
		self.ball_accel_mult = 1
		self.ball_basespeed_mult = 1.2
		self.player_speed_mult = 1.1
		self.base_max_speed = self.game.ball.maxSpeed

	def apply_specific(self):
		self.game.ball.maxSpeed = 500

	def revert_specific(self):
		self.game.ball.maxSpeed = self.base_max_speed

class ReverseBallEvent(GameEvent):
	def __init__(self, game: RumbleGameInstance):
		self.game = game
		self.name = "Reverse Ball"
		self.description = "The ball can randomly reverse its direction"
		self.action = 'none'
		self.ball_accel_mult = 1
		self.ball_basespeed_mult = 1
		self.player_speed_mult = 1
		self.base_max_speed = self.game.ball.maxSpeed
		self.reverse_task = None
		self.reverse_interval = random.randint(2, 8)

	async def reverse_ball_direction(self):
		try:
			while True:
				await asyncio.sleep(self.reverse_interval)
				self.game.ball.velocity.x *= -1.5
				self.game.ball.velocity.y *= -1.5
				self.reverse_interval = random.randint(2, 8)
				self.game.logger.info("Ball direction reversed!")
		except asyncio.CancelledError:
			self.game.logger.info("Reverse ball direction task cancelled")

	def apply_specific(self):
		self.reverse_task = asyncio.create_task(self.reverse_ball_direction())

	def revert_specific(self):
		if self.reverse_task:
			self.reverse_task.cancel()
			self.reverse_task = None


class ShrinkingPaddleEvent(GameEvent):
	def __init__(self, game: RumbleGameInstance):
		self.game = game
		self.name = "Shrinking Paddles"
		self.action = 'none'
		self.description = "Each hit will shrink your paddle !"
		self.ball_accel_mult = 0.9
		self.ball_basespeed_mult = 0.9
		self.player_speed_mult = 1
		self.paddle_height = self.game.player_left.paddle_height

	def apply_specific(self):
		pass

	def revert_specific(self):
		self.action = 'reset'
		self.game.player_left.paddle_height = self.paddle_height
		self.game.player_right.paddle_height = self.paddle_height


# class SwitchSideEvent(GameEvent):
# 	def __init__(self, game: RumbleGameInstance):
# 		self.game = game
# 		self.name = "Random Bounces"
# 		self.description = "All bounces from the ball are random !"
# 		self.ball_accel_mult = 1
# 		self.ball_basespeed_mult = 0.9
# 		self.player_speed_mult = 1.1

# 	def apply_specific(self):
# 		self.game.ball.bounce_methods = RandomBounce()

# 	def revert_specific(self):
# 		self.game.ball.bounce_methods = NormalBounce()
#

# class NoStopping(GameEvent):
# 	def __init__(self, game: RumbleGameInstance):
# 		self.game = game
# 		self.name = "Random Bounces"
# 		self.description = "You cannot stop anymore"
# 		self.ball_accel_mult = 1
# 		self.ball_basespeed_mult = 0.9
# 		self.player_speed_mult = 1.1

# 	def apply_specific(self):
# 		self.game.ball.bounce_methods = RandomBounce()

# 	def revert_specific(self):
# 		self.game.ball.bounce_methods = NormalBounce()


# class KillerBallEvent(GameEvent):
# 	def __init__(self, game: RumbleGameInstance):
# 		self.game = game
# 		self.name = "Random Bounces"
# 		self.description = "All bounces from the ball are random !"
# 		self.ball_accel_mult = 1
# 		self.ball_basespeed_mult = 0.9
# 		self.player_speed_mult = 1.1

# 	def apply_specific(self):
# 		self.game.ball.bounce_methods = RandomBounce()

# 	def revert_specific(self):
# 		self.game.ball.bounce_methods = NormalBounce()


class IcyPaddlesEvent(GameEvent):
	def __init__(self, game: RumbleGameInstance):
		self.game = game
		self.name = "Icy Paddle"
		self.action = 'none'
		self.description = "Your paddle is now slippery !"
		self.ball_accel_mult = 0.95
		self.ball_basespeed_mult = 0.95
		self.player_speed_mult = 1

	def apply_specific(self):
		logging.getLogger('game').info(self.game.player_left.movement_method)
		self.game.player_left.movement_method = IcyMovement()
		self.game.player_right.movement_method = IcyMovement()
		logging.getLogger('game').info(self.game.player_left.movement_method)

	def revert_specific(self):
		self.game.player_left.movement_method = NormalMovements()
		self.game.player_right.movement_method = NormalMovements()

# class VisibleTrajectoryEvent(GameEvent):
# 	def __init__(self, game: RumbleGameInstance):
# 		self.game = game
# 		self.name = "Random Bounces"
# 		self.description = "All bounces from the ball are random !"
# 		self.ball_accel_mult = 1
# 		self.ball_basespeed_mult = 0.9
# 		self.player_speed_mult = 1.1

# 	def apply_specific(self):
# 		self.game.ball.bounce_methods = RandomBounce()

# 	def revert_specific(self):
# 		self.game.ball.bounce_methods = NormalBounce()

# class CameraShakeEvent(GameEvent):
# 	def __init__(self, game: RumbleGameInstance):
# 		self.game = game
# 		self.name = "Random Bounces"
# 		self.description = "All bounces from the ball are random !"
# 		self.ball_accel_mult = 1
# 		self.ball_basespeed_mult = 0.9
# 		self.player_speed_mult = 1.1

# 	def apply_specific(self):
# 		self.game.ball.bounce_methods = RandomBounce()

# 	def revert_specific(self):
# 		self.game.ball.bounce_methods = NormalBounce()
