from abc import ABC, abstractmethod
import math
import random

class BounceMethods(ABC):
	@abstractmethod
	def BounceWall(self, ball, is_top):
		pass

	@abstractmethod
	async def BouncePaddle(self, ball, paddle_x, paddle_y):
		pass

class MovementMethod(ABC):
	@abstractmethod
	def calculate_movement(self, input_direction: int, speed: float, delta_time: float) -> float:
		pass

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

def random_angle(ball):
	random_angle = random.uniform(-40, 40)
	random_angle_rad = math.radians(random_angle)
	ball.velocity.x *= -1
	directionY = (ball.velocity.y > 0) * 2 - 1
	ball.velocity.y = abs(ball.speed * math.tan(random_angle_rad)) * directionY
	ball.velocity.normalize()
	ball.velocity.y *= ball.speed
	ball.velocity.x *= ball.speed
	ball.speed += ball.acceleration
	if ball.speed >= ball.maxSpeed:
		ball.speed = ball.maxSpeed

DEFAULT_BALL_POS = Vector2D(0, 7.8, -15)
RIGHT_SIDE_DIR = 1
LEFT_SIDE_DIR = -1
DEFAULT_BALL_ACCELERATION = 1
DEFAULT_BALL_BASE_SPEED = 30
DEFAULT_PLAYER_SPEED = 35
