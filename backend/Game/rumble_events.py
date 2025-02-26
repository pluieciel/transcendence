import asyncio
import random
import logging
from abc import ABC, abstractmethod

from asyncio.base_events import time
from .game_helper_class import DEFAULT_BALL_ACCELERATION, DEFAULT_BALL_BASE_SPEED, DEFAULT_PLAYER_SPEED
from .rumble_custom_method import MirrorBounce, RandomBounce, IcyMovement, InvertedMovements, NoStoppingMovements, NormalBounce, NormalMovements, KillerBall

class GameEvent(ABC):
	def __init__(self, game: 'RumbleGameInstance'):
		self.name = None
		self.description = None
		self.game = game
		self.ball_accel_mult = 1
		self.ball_basespeed_mult = 1
		self.player_speed_mult = 1
		self.ball_maxspeed_mult = 1
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
		self.game.ball.maxSpeed = self.game.ball.calculate_max_safe_speed(self.game.player_left.paddle_speed) * self.ball_maxspeed_mult


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
		self.game.ball.maxSpeed = self.game.ball.baseMaxSpeed

	@abstractmethod
	def revert_specific(self):
		pass

class InvertedControlsEvent(GameEvent):
	def __init__(self, game: 'RumbleGameInstance'):
		super().__init__(game)
		self.game = game
		self.icon = "fa-solid fa-arrows-rotate"
		self.name = "Inverted Controls"
		self.description = "Controls are inverted !"

	def apply_specific(self):
		self.game.player_left.movement_method = InvertedMovements()
		self.game.player_right.movement_method = InvertedMovements()

	def revert_specific(self):
		self.game.player_left.movement_method = NormalMovements()
		self.game.player_right.movement_method = NormalMovements()


class RandomBouncesEvent(GameEvent):
	def __init__(self, game: 'RumbleGameInstance'):
		super().__init__(game)
		self.game = game
		self.icon = "fa-solid fa-shuffle"
		self.name = "Random Bounces"
		self.description = "All bounces from the ball are random !"
		self.ball_accel_mult = 0.9
		self.ball_basespeed_mult = 0.8
		self.player_speed_mult = 1.1

	def apply_specific(self):
		self.game.ball.bounce_methods = RandomBounce()

	def revert_specific(self):
		self.game.ball.bounce_methods = NormalBounce()

class MirrorBallEvent(GameEvent):
	def __init__(self, game: 'RumbleGameInstance'):
		super().__init__(game)
		self.game = game
		self.icon = "fa-solid fa-arrow-down-up-across-line"
		self.name = "Mirror Ball"
		self.description = "The ball teleports to the opposite wall instead of bouncing"

	def apply_specific(self):
		self.game.ball.bounce_methods = MirrorBounce()

	def revert_specific(self):
		self.game.ball.bounce_methods = NormalBounce()

class LightsOutEvent(GameEvent):
	def __init__(self, game: 'RumbleGameInstance'):
		super().__init__(game)
		self.game = game
		self.icon = "fa-solid fa-lightbulb"
		self.name = "Lights Out"
		self.description = "The lights turned off"

	def apply_specific(self):
		self.action = 'off'

	def revert_specific(self):
		self.action = 'on'


class InvisibilityFieldEvent(GameEvent):
	def __init__(self, game: 'RumbleGameInstance'):
		super().__init__(game)
		self.game = game
		self.icon = "fa-solid fa-smog"
		self.name = "Invisibility Field"
		self.action = 'smoke'
		self.description = "The ball disappears when in the middle of the field !"

	def apply_specific(self):
		self.action = 'smoke'

	def revert_specific(self):
		self.action = 'reset'

class RampingBallEvent(GameEvent):
	def __init__(self, game: 'RumbleGameInstance'):
		super().__init__(game)
		self.game = game
		self.icon = "fa-solid fa-gauge-high"
		self.name = "Ramping Ball"
		self.description = "The ball accelerates really fast!"
		self.ball_accel_mult = 2
		self.player_speed_mult = 1.1
		self.ball_maxspeed_mult = 15
		self.ball_basespeed_mult = 0.8

	def apply_specific(self):
		pass

	def revert_specific(self):
		pass

class ReverseBallEvent(GameEvent):
	def __init__(self, game: 'RumbleGameInstance'):
		self.game = game
		self.icon = "fa-solid fa-backward"
		self.name = "Reverse Ball"
		self.description = "The ball can randomly reverse its direction"
		self.base_max_speed = self.game.ball.maxSpeed
		self.action = 'none'
		self.ball_accel_mult = 1
		self.ball_basespeed_mult = 1
		self.player_speed_mult = 1
		self.ball_maxspeed_mult = 1

		self.reverse_task = None
		self.normal_reverse_interval = (3, 6)
		self.fast_reverse_interval = (1, 3)
		self.fast_chance = 0.2

	async def reverse_ball_direction(self):
		try:
			await asyncio.sleep(5)
			while True:
				if (random.random() < self.fast_chance):
					self.reverse_interval = random.uniform(*self.fast_reverse_interval)
				else:
					self.reverse_interval = random.uniform(*self.normal_reverse_interval)
				await asyncio.sleep(self.reverse_interval)
				self.game.ball.velocity.x *= -1.5
				self.game.ball.velocity.y *= -1.5
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
		self.icon = "fa-solid fa-arrows-left-right-to-line"
		self.name = "Shrinking Paddles"
		self.description = "Each hit will shrink your paddle !"
		self.action = 'none'
		self.ball_accel_mult = 0.8
		self.ball_basespeed_mult = 0.8
		self.ball_maxspeed_mult = 1
		self.player_speed_mult = 1
		self.paddle_height = self.game.player_left.paddle_height

	def apply_specific(self):
		pass

	def revert_specific(self):
		self.action = 'reset'
		self.game.player_left.paddle_height = self.paddle_height
		self.game.player_right.paddle_height = self.paddle_height
		self.game.player_left.currentShrinkPaddle = 0
		self.game.player_right.currentShrinkPaddle = 0

class NoStoppingEvent(GameEvent):
	def __init__(self, game: 'RumbleGameInstance'):
		self.game = game
		self.icon = "fa-solid fa-forward"
		self.name = "No Stopping"
		self.description = "You cannot stop moving once you start!"
		self.ball_accel_mult = 1
		self.ball_basespeed_mult = 1
		self.player_speed_mult = 1
		self.ball_maxspeed_mult = 1
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
		self.icon = "fa-solid fa-skull-crossbones"
		self.action = 'none'
		self.name = "Killer Ball"
		self.description = "Do not get hit by the ball !"
		self.ball_accel_mult = 1.1
		self.ball_basespeed_mult = 0.9
		self.player_speed_mult = 1.1
		self.ball_maxspeed_mult = 6
		self.killer_ball_start_time = None

	def apply_specific(self):
		self.game.ball.bounce_methods = KillerBall(self.game)
		self.killer_ball_start_time = time.time() + 5

	def revert_specific(self):
		survived_time = time.time() - self.killer_ball_start_time
		if (survived_time > self.game.highestKillerSurvive):
			self.game.highestKillerSurvive = survived_time
		self.game.ball.bounce_methods = NormalBounce()
		self.killer_ball_start_time = None


class IcyPaddlesEvent(GameEvent):
	def __init__(self, game: 'RumbleGameInstance'):
		self.game = game
		self.icon = "fa-solid fa-snowflake"
		self.name = "Icy Paddle"
		self.action = 'none'
		self.description = "Your paddle is now slippery !"
		self.ball_accel_mult = 0.95
		self.ball_basespeed_mult = 0.95
		self.player_speed_mult = 1
		self.ball_maxspeed_mult = 1

	def apply_specific(self):
		self.game.player_left.movement_method = IcyMovement()
		self.game.player_right.movement_method = IcyMovement()

	def revert_specific(self):
		self.game.player_left.movement_method = NormalMovements()
		self.game.player_right.movement_method = NormalMovements()

class VisibleTrajectoryEvent(GameEvent):
	def __init__(self, game: 'RumbleGameInstance'):
		self.game = game
		self.icon = "fa-solid fa-arrow-trend-up"
		self.name = "Visible Trajectory"
		self.description = "You can now see the ball trajectory, but it goes faster !"
		self.action = 'none'
		self.ball_accel_mult = 1.3
		self.ball_basespeed_mult = 1
		self.player_speed_mult = 1.3
		self.ball_maxspeed_mult = 15

	def apply_specific(self):
		pass

	def revert_specific(self):
		pass


class BreathingTimeEvent(GameEvent):
	def __init__(self, game: 'RumbleGameInstance'):
		self.game = game
		self.icon = "fa-solid fa-stopwatch"
		self.name = "Breathing Time"
		self.action = 'none'
		self.description = "Nothing happens"
		self.ball_accel_mult = 1
		self.ball_basespeed_mult = 1
		self.player_speed_mult = 1
		self.ball_maxspeed_mult = 1


	def apply_specific(self):
		pass

	def revert_specific(self):
		pass

class SupersonicBallEvent(GameEvent):
	def __init__(self, game: 'RumbleGameInstance'):
		self.game = game
		self.icon = "fa-solid fa-stopwatch"
		self.name = "Supersonic Ball"
		self.description = "The ball starts really fast"
		self.action = 'none'
		self.ball_accel_mult = 0.5
		self.ball_basespeed_mult = 1.3
		self.player_speed_mult = 1.2
		self.ball_maxspeed_mult = 1

	def apply_specific(self):
		pass

	def revert_specific(self):
		pass

class InfiniteSpeedEvent(GameEvent):
	def __init__(self, game: 'RumbleGameInstance'):
		self.game = game
		self.icon = "fa-solid fa-infinity"
		self.name = "Infinite Speed"
		self.description = "The ball can accelerate beyond the max speed"
		self.action = 'none'
		self.ball_accel_mult = 1.1
		self.ball_basespeed_mult = 1
		self.player_speed_mult = 1.1
		self.ball_maxspeed_mult = 15

	def apply_specific(self):
		pass

	def revert_specific(self):
		pass
