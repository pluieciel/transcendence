import random
import math
import logging
from .game_helper_class import BounceMethods, MovementMethod, Vector2D

################### BOUNCE METHOD ###################

class NormalBounce(BounceMethods):
	def BounceWall(self, ball, is_top):
		ball.velocity.y *= -1
		if is_top:
			ball.position.y = ball.bounds.top.y - ball.radius
		else:
			ball.position.y = ball.bounds.bottom.y + ball.radius

	async def BouncePaddle(self, ball, paddle_x, paddle_y):
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

class NormalMovements(MovementMethod):
	def calculate_movement(self, input_direction: int, speed: float, delta_time: float) -> float:
		return input_direction * speed * delta_time

class MirrorBounce(BounceMethods):
	def BounceWall(self, ball, is_top):
		if is_top:
			ball.position.y = ball.bounds.bottom.y + ball.radius
		else:
			ball.position.y = ball.bounds.top.y - ball.radius

	async def BouncePaddle(self, ball, paddle_x, paddle_y):
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
		random_angle = random.uniform(-80, 80)
		random_angle_rad = math.radians(random_angle)

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

	async def BouncePaddle(self, ball, paddle_x, paddle_y):
		random_angle = random.uniform(-80, 80)
		random_angle_rad = math.radians(random_angle)

		if paddle_x < ball.position.x:
			ball.velocity.x = ball.speed * math.cos(random_angle_rad)
		else:
			ball.velocity.x = -ball.speed * math.cos(random_angle_rad)
		ball.velocity.y = ball.speed * math.sin(random_angle_rad)
		ball.velocity.normalize()
		ball.velocity.x *= ball.speed
		ball.velocity.y *= ball.speed

		ball.speed += ball.acceleration
		if ball.speed >= ball.maxSpeed:
			ball.speed = ball.maxSpeed

class KillerBall(BounceMethods):
	def __init__(self, game):
		self.game = game

	def BounceWall(self, ball, is_top):
		ball.velocity.y *= -1
		if is_top:
			ball.position.y = ball.bounds.top.y - ball.radius
		else:
			ball.position.y = ball.bounds.bottom.y + ball.radius

	async def BouncePaddle(self, ball, paddle_x, paddle_y):
		if paddle_x < ball.position.x:
			await self.game.on_score("RIGHT")
		else:  # Left paddle
			await self.game.on_score("LEFT")

################### MOVEMENT METHOD ###################

class InvertedMovements(MovementMethod):
	def calculate_movement(self, input_direction: int, speed: float, delta_time: float) -> float:
		return -input_direction * speed * delta_time

class NoStoppingMovements(MovementMethod):
	def __init__(self):
		self.current_direction = 0

	def calculate_movement(self, input_direction: int, speed: float, delta_time: float) -> float:
		if input_direction != 0:
			self.current_direction = input_direction
		return self.current_direction * speed * delta_time

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
