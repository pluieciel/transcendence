import asyncio
import time
import random
import math
import logging
from .normal_game_logic import Vector2D

class BotAvatar:
 def __init__(self, url):
 	self.url = url


class BotUser:
	def __init__(self, difficulty, elo, color, user_id, localUser = None):
		# self.username = username
		if (localUser == None):
			self.username = "AI (" + difficulty.capitalize() + ")"
			self.avatar = BotAvatar("/imgs/bot-" + difficulty + ".jpg")
		else:
			self.username = localUser.username + " (2)"
			self.avatar = BotAvatar('/imgs/default_avatar.png')
		self.display_name = self.username
		self.elo = elo
		self.color = color
		self.id = user_id
		self.avatar_42 = None

class Bot:
	def __init__(self, difficulty, game, localUser):
		if not localUser:
			match difficulty:
				case 1:
					self.user = BotUser("easy", 800, 1, -1)
				case 2:
					self.user = BotUser("medium", 1200, 1, -1)
				case 5:
					self.user = BotUser("hard", 1800, 1, -1)
		else:
			self.user = BotUser(localUser.username, 1000, 1, -1, localUser)
		self.channel = None
		self.state = "Ready"
		if not localUser:
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
			return None

		if not self.paddle_position:
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

		dead_zone = (self.paddle_height/2) * 0.5
		distance = target_y - self.paddle_position.y

		if abs(distance) > dead_zone:
			if hasattr(self.game, 'event'):
				if distance > 0:
					self.game.player_right.keys["ArrowUp"] = self.game.event.name != 'Inverted Controls'
					self.game.player_right.keys["ArrowDown"] = self.game.event.name == 'Inverted Controls'
				else:
					self.game.player_right.keys["ArrowUp"] = self.game.event.name == 'Inverted Controls'
					self.game.player_right.keys["ArrowDown"] = self.game.event.name != 'Inverted Controls'
			else:
				if distance > 0:
					self.game.player_right.keys["ArrowUp"] = True
					self.game.player_right.keys["ArrowDown"] = False
				else:
					self.game.player_right.keys["ArrowUp"] = False
					self.game.player_right.keys["ArrowDown"] = True
		else:
			self.game.player_right.keys["ArrowUp"] = False
			self.game.player_right.keys["ArrowDown"] = False

	def calculate_safe_position(self):
		# Move the paddle to the opposite side of the ball
		if not self.paddle_position:
			return self.game.bounds.bottom.y
		court_top = self.game.bounds.top.y
		court_bottom = self.game.bounds.bottom.y
		if self.ball_position and self.ball_position.y < (court_top + court_bottom) / 2:
			return court_top - self.paddle_height / 2
		else:
			return court_bottom + self.paddle_height / 2

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
		if hasattr(self.game, 'event') and self.game.event.name == 'Killer Ball':
			self.logger.info("Killer Ball event detected")
			target_y = self.calculate_safe_position()
		else:
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
					self.update_vision()
					self.last_vision_update = current_time

				self.update_movement()
				await asyncio.sleep(1/60)

		except asyncio.CancelledError:
			self.logger.error(f"Bot stopped")
		except Exception as e:
			self.logger.error(f"Error in bot loop: {e}")
