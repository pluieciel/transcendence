import asyncio
import time
import random
import math
import logging
from .normal_game_logic import Vector2D


class BotUser:
    def __init__(self, username, elo, color, user_id):
        self.username = username
        self.elo = elo
        self.color = color
        self.id = user_id


class Bot:
	def __init__(self, difficulty, game):
		self.user = BotUser(f'Bot (Level {difficulty})', 1000, 1, -1)
		self.channel = None
		self.state = "Ready"
		self.game = game
		self.difficulty = difficulty
		self.is_running = False
		self.ready = False
		self.loop_task = None
		self.last_update_time = time.time()
		self.last_vision_update = time.time()
		self.vision_update_rate = 1.0 / self.difficulty  # Update vision once per second
		self.ball_position = None
		self.ball_velocity = None
		self.ball_radius = None
		self.paddle_position = None
		self.paddle_height = None
		self.target_y = None  # Store the target position
		self.logger = logging.getLogger('game')

	def calculate_ball_landing_position(self):
		if not self.ball_position or not self.ball_velocity:
			self.logger.info("Ball position or velocity not available yet")
			return None

		if not self.paddle_position:
			self.logger.info("Paddle position not available yet")
			return None

		# Only calculate if ball is moving towards the bot (right side)
		if self.ball_velocity.x <= 0:
			return self.paddle_position.y  # Return current paddle position if ball moving away

		# Simple linear interpolation to predict Y position
		distance_to_paddle = self.paddle_position.x - self.ball_position.x
		time_to_reach = distance_to_paddle / self.ball_velocity.x
		predicted_y = self.ball_position.y + (self.ball_velocity.y * time_to_reach)

		# Bound the prediction within the court limits
		court_top = self.game.bounds.top.y
		court_bottom = self.game.bounds.bottom.y
		predicted_y = min(max(predicted_y, court_bottom + self.paddle_height/2),
					 court_top - self.paddle_height/2)

		return predicted_y

	def move_paddle(self, target_y):
		if not target_y or not self.paddle_position:
			return

		dead_zone = 0.5  # Adjust this value as needed
		distance = target_y - self.paddle_position.y

		if abs(distance) > dead_zone:
			if distance > 0:  # Need to move up
				self.game.player_right.keys["ArrowUp"] = True
				self.game.player_right.keys["ArrowDown"] = False
			else:  # Need to move down
				self.game.player_right.keys["ArrowUp"] = False
				self.game.player_right.keys["ArrowDown"] = True
		else:  # Within dead zone - stop moving
			self.game.player_right.keys["ArrowUp"] = False
			self.game.player_right.keys["ArrowDown"] = False


	def update_vision(self):
		#self.logger.info("Bot Updated Vision")
		self.ball_position = Vector2D(
		self.game.ball.position.x,
		self.game.ball.position.y,
		self.game.ball.position.z
	)
		self.ball_velocity = Vector2D(
		self.game.ball.velocity.x,
		self.game.ball.velocity.y,
		self.game.ball.velocity.z
	)


		self.ball_radius = self.game.ball.radius
		self.paddle_position = self.game.player_right.position
		self.paddle_height = self.game.player_right.paddle_height

	def update_movement(self):
		target_y = self.calculate_ball_landing_position()
		if target_y is not None:
			self.move_paddle(target_y)

	def start_bot(self):
		self.is_running = True
		self.loop_task = asyncio.create_task(self.update_view())
		self.logger.info("Bot Started")

	async def update_view(self):
		try:
			while self.is_running:
				current_time = time.time()

				if current_time - self.last_vision_update >= self.vision_update_rate:
					#self.logger.info(f"{self.vision_update_rate} compared to {current_time - self.last_vision_update}")
					self.update_vision()
					self.last_vision_update = current_time

				self.update_movement()
				await asyncio.sleep(1/60)

		except asyncio.CancelledError:
			self.logger.error(f"Bot stopped")
		except Exception as e:
			self.logger.error(f"Error in bot loop: {e}")
