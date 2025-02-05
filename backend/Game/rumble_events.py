import asyncio
import random
import logging
from abc import ABC, abstractmethod
from .game_helper_class import DEFAULT_BALL_ACCELERATION, DEFAULT_BALL_BASE_SPEED, DEFAULT_PLAYER_SPEED
from .rumble_custom_method import MirrorBounce, RandomBounce, IcyMovement, InvertedMovements, NoStoppingMovements, NormalBounce, NormalMovements, KillerBall

class GameEvent(ABC):
	def __init__(self, game: 'RumbleGameInstance'):
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
	def __init__(self, game: 'RumbleGameInstance'):
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
	def __init__(self, game: 'RumbleGameInstance'):
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
	def __init__(self, game: 'RumbleGameInstance'):
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
	def __init__(self, game: 'RumbleGameInstance'):
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
	def __init__(self, game: 'RumbleGameInstance'):
		self.game = game
		self.name = "SmokeCloud"
		self.action = 'smoke'
		self.description = "The ball disappears when in the middle of the field !"
		self.ball_accel_mult = 1
		self.ball_basespeed_mult = 1
		self.player_speed_mult = 1

	def apply_specific(self):
		self.action = 'smoke'

	def revert_specific(self):
		self.action = 'reset'

class InfiniteSpeedEvent(GameEvent):
	def __init__(self, game: 'RumbleGameInstance'):
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
	def __init__(self, game: 'RumbleGameInstance'):
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
	def __init__(self, game: 'RumbleGameInstance'):
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

class NoStoppingEvent(GameEvent):
	def __init__(self, game: 'RumbleGameInstance'):
		self.game = game
		self.name = "No Stopping"
		self.description = "You cannot stop moving once you start!"
		self.ball_accel_mult = 1
		self.ball_basespeed_mult = 1
		self.player_speed_mult = 1
		self.action = 'none'

	def apply_specific(self):
		self.game.player_left.movement_method = NoStoppingMovements()
		self.game.player_right.movement_method = NoStoppingMovements()

	def revert_specific(self):
		self.game.player_left.movement_method = NormalMovements()
		self.game.player_right.movement_method = NormalMovements()


class KillerBallEvent(GameEvent):
	def __init__(self, game: 'RumbleGameInstance'):
		self.game = game
		self.action = 'none'
		self.name = "Killer Ball"
		self.description = "Do not get hit by the ball !"
		self.ball_accel_mult = 1.1
		self.ball_basespeed_mult = 0.9
		self.player_speed_mult = 1.1

	def apply_specific(self):
		self.game.ball.bounce_methods = KillerBall(self.game)

	def revert_specific(self):
		self.game.ball.bounce_methods = NormalBounce()


class IcyPaddlesEvent(GameEvent):
	def __init__(self, game: 'RumbleGameInstance'):
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

class VisibleTrajectoryEvent(GameEvent):
	def __init__(self, game: 'RumbleGameInstance'):
		self.game = game
		self.name = "Visible Trajectory"
		self.action = 'none'
		self.description = "You can now see the ball trajectory, but it goes faster !"
		self.ball_accel_mult = 1.3
		self.ball_basespeed_mult = 1
		self.player_speed_mult = 1.3

	def apply_specific(self):
		pass

	def revert_specific(self):
		pass


class BreathingTimeEvent(GameEvent):
	def __init__(self, game: 'RumbleGameInstance'):
		self.game = game
		self.name = "Breathing Time"
		self.action = 'none'
		self.description = "Nothing happens"
		self.ball_accel_mult = 1
		self.ball_basespeed_mult = 1
		self.player_speed_mult = 1

	def apply_specific(self):
		pass

	def revert_specific(self):
		pass
