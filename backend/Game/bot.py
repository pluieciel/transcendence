import asyncio
import time
import random
import math
import logging

class Bot:
	def __init__(self, difficulty, game):
		self.user = type('BotUser', (), {
			'username': f'Bot (Level {difficulty})',
			'elo': 1000,
			'id': -1
		})()
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
		self.paddle_position = None
		self.paddle_height = None
		self.target_y = None  # Store the target position
		self.logger = logging.getLogger('game')

	def calculate_ball_landing_position(self):
		if not self.ball_position or not self.ball_velocity:
			self.logger.info("Ball position or velocity not available yet")
			return None

		if not hasattr(self.ball_position, 'x') or not hasattr(self.ball_velocity, 'x'):
			self.logger.info("Ball position or velocity missing coordinates")
			return None

		sim_pos_x = self.ball_position.x
		sim_pos_y = self.ball_position.y
		sim_vel_x = self.ball_velocity.x
		sim_vel_y = self.ball_velocity.y

		if not self.paddle_position or not hasattr(self.paddle_position, 'x'):
			self.logger.info("Paddle position not available yet")
			return None

		if (self.paddle_position.x < 0 and sim_vel_x > 0) or \
		   (self.paddle_position.x > 0 and sim_vel_x < 0):
			return None

		while ((self.paddle_position.x < 0 and sim_pos_x > self.paddle_position.x) or
			   (self.paddle_position.x > 0 and sim_pos_x < self.paddle_position.x)):

			sim_pos_x += sim_vel_x * 0.016
			sim_pos_y += sim_vel_y * 0.016

			# Check for top/bottom bounces
			if sim_pos_y >= self.game.bounds.top.y or sim_pos_y <= self.game.bounds.bottom.y:
				sim_vel_y *= -1

		return sim_pos_y

	def move_paddle(self, target_y):
		if not target_y or not self.paddle_position:
			return

		# Add some randomness based on difficulty
		error_margin = (1.0 - self.difficulty/10) * self.paddle_height
		target_y += random.uniform(-error_margin, error_margin)

		# Calculate deadzone (area where paddle should stop)
		deadzone = 2  # Adjustable deadzone size
		current_y = self.paddle_position.y


		if abs(current_y - target_y) < deadzone:
			self.logger.info("Bot stopping")
			self.game.player_right.keys["ArrowUp"] = False
			self.game.player_right.keys["ArrowDown"] = False
			return

		# Move up
		if current_y < target_y - deadzone:
			self.logger.info("Bot going up")
			self.game.player_right.keys["ArrowUp"] = True
			self.game.player_right.keys["ArrowDown"] = False
		# Move down
		elif current_y > target_y + deadzone:
			self.logger.info("Bot going down")
			self.game.player_right.keys["ArrowUp"] = False
			self.game.player_right.keys["ArrowDown"] = True
		# Stop moving when within deadzone
		else:
			self.logger.info("Bot stopping")
			self.game.player_right.keys["ArrowUp"] = False
			self.game.player_right.keys["ArrowDown"] = False

	def update_vision(self):
		self.logger.info("Bot Updated Vision")
		self.ball_position = self.game.ball.position
		self.ball_velocity = self.game.ball.velocity
		# Calculate new target position
		landing_y = self.calculate_ball_landing_position()
		if landing_y is not None:
			self.target_y = landing_y
		else:
			# Return to center if ball is moving away
			self.target_y = self.game.bounds.bottom.y + \
						  (self.game.bounds.top.y - self.game.bounds.bottom.y) / 2

	def update_movement(self):
		self.paddle_position = self.game.player_right.position
		self.paddle_height = self.game.player_right.paddle_height
		if self.target_y is not None:
			self.move_paddle(self.target_y)

	def start_bot(self):
		self.is_running = True
		self.loop_task = asyncio.create_task(self.update_view())
		self.logger.info("Bot Started")

	async def update_view(self):
		try:
			self.logger.info("Loop starting")
			while self.is_running:
				self.logger.info("Loop")
				current_time = time.time()

				if current_time - self.last_vision_update >= self.vision_update_rate:
					self.update_vision()
					self.last_vision_update = current_time
				else:
					self.logger.info(f"current time : {current_time} last update : {self.last_vision_update}")

				self.update_movement()
				self.logger.info("Loop end")
				await asyncio.sleep(1/60)

		except asyncio.CancelledError:
			self.logger.error(f"Bot stopped")
		except Exception as e:
			self.logger.error(f"Error in bot loop: {e}")
