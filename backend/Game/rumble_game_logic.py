import asyncio
import time
import random
import math
import logging
from .game_helper_class import BounceMethods, MovementMethod, Vector2D, DEFAULT_BALL_POS, RIGHT_SIDE_DIR, LEFT_SIDE_DIR, DEFAULT_BALL_ACCELERATION, DEFAULT_BALL_BASE_SPEED, DEFAULT_PLAYER_SPEED, random_angle
from .rumble_custom_method import MirrorBounce, RandomBounce, IcyMovement, InvertedMovements, NoStoppingMovements, NormalBounce, NormalMovements, KillerBall
from .rumble_events import InvertedControlsEvent, RandomBouncesEvent, MirrorBallEvent, LightsOutEvent, InvisibilityFieldEvent, ReverseBallEvent, ShrinkingPaddleEvent, IcyPaddlesEvent, NoStoppingEvent, VisibleTrajectoryEvent, KillerBallEvent, BreathingTimeEvent, SupersonicBallEvent, InfiniteSpeedEvent, RampingBallEvent



class Ball:
	def __init__(self):
		self.position = DEFAULT_BALL_POS
		self.velocity = Vector2D()
		self.baseSpeed = DEFAULT_BALL_BASE_SPEED
		self.speed = self.baseSpeed
		self.reaction_time = 0.2
		self.maxSpeed = self.calculate_max_safe_speed()
		self.baseMaxSpeed = self.calculate_max_safe_speed()
		self.radius = 0.5
		self.bounds = GameBounds()
		self.countdown = 6
		self.visible = False
		self.is_moving = False
		self.acceleration = DEFAULT_BALL_ACCELERATION
		self.highestSpeed = 0
		self.bounce_methods = NormalBounce()
		self.lastHitter = "NONE"

	def calculate_max_safe_speed(self, paddle_speed=35):
		bounds = GameBounds()
		court_height = bounds.top.y - bounds.bottom.y
		court_width = bounds.right.x - bounds.left.x
		max_paddle_travel = court_height - 5.006
		paddle_travel_time = max_paddle_travel / paddle_speed
		ball_travel_distance = court_width
		max_safe_speed = ball_travel_distance / (paddle_travel_time + self.reaction_time)
		logging.getLogger('game').info(f"Max safe speed: {max_safe_speed}")
		return (max_safe_speed)

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
		self.movable = False
		self.game_bounds = game_bounds
		self.startPos = Vector2D(0, 0, 0)
		self.movement_method = NormalMovements()
		self.highestShrinkPaddle = 0
		self.currentShrinkPaddle = 0

	def update(self, delta_time):
		if (self.movable):
			movement = 0
			if self.keys["ArrowUp"] or self.keys["W"]:
				movement = 1
			if self.keys["ArrowDown"] or self.keys["S"]:
				movement = -1

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
	def __init__(self, broadcast_fun, revert_event_fun, game_end_fun, achievement_checker_fun, tournament, local):
		self.bounds = GameBounds()
		self.local = local
		self.event_weights = {
			"InvertedControlsEvent": 800,
			"RandomBouncesEvent": 1500,
			"MirrorBallEvent": 1000,
			"LightsOutEvent": 300,
			"InvisibilityFieldEvent": 1500,
			"InfiniteSpeedEvent": 1000,
			"ReverseBallEvent": 1500,
			"ShrinkingPaddleEvent": 1000,
			"IcyPaddlesEvent": 1000,
			"NoStoppingEvent": 1000,
			"VisibleTrajectoryEvent": 1200,
			"KillerBallEvent": 1500,
			"BreathingTimeEvent": 300,
			"SupersonicBallEvent": 1200,
			"RampingBallEvent": 1000
		}
		self.player_left = Player(Vector2D(self.bounds.left.x + 2, -3+10.5, -15), 0,{"ArrowUp": False, "ArrowDown": False, "W" : False, "S" : False}, self.bounds)
		self.player_right = Player(Vector2D(self.bounds.right.x - 2, -3+10.5, -15), 0,{"ArrowUp": False, "ArrowDown": False, "W" : False, "S" : False}, self.bounds)
		self.ball = Ball()
		self.tournament = tournament
		self.original_ball_acceleration = self.ball.acceleration
		self.original_ball_base_speed = self.ball.baseSpeed
		self.original_player_speed = DEFAULT_PLAYER_SPEED
		self.event = self.get_event()
		self.event.apply()
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
		self.announceEvent = True
		self.highestKillerSurvive = 0
		self.revert_event_fun = revert_event_fun
		self.achievement_checker_fun = achievement_checker_fun

	async def check_collisions(self):
		ball = self.ball
		ball_pos = ball.position
		paddle_hit = False

		if ball_pos.y >= self.bounds.top.y - ball.radius:
			ball.bounce_methods.BounceWall(ball, True)
			self.logger.info(f"Ball speed : {ball.speed}")
		elif ball_pos.y <= self.bounds.bottom.y + ball.radius:
			ball.bounce_methods.BounceWall(ball, False)
			self.logger.info(f"Ball speed : {ball.speed}")

		right_paddle = self.player_right
		if (ball_pos.x <= right_paddle.position.x + right_paddle.paddle_thickness/2 + ball.radius and
			ball_pos.x >= right_paddle.position.x - right_paddle.paddle_thickness/2 - ball.radius):
			if (abs(ball_pos.y - right_paddle.position.y) <=
				right_paddle.paddle_height/2 + ball.radius):
					if ball.velocity.x > 0:
						ball.position.x = right_paddle.position.x - right_paddle.paddle_thickness/2 - ball.radius
						await ball.bounce_methods.BouncePaddle(ball, right_paddle.position.x, right_paddle.position.y)
						if (self.ball.highestSpeed < ball.speed):
							self.ball.highestSpeed = ball.speed
						self.logger.info(f"Ball speed : {ball.speed}")

						if (self.event.name == 'Shrinking Paddles' and self.player_right.paddle_height > 2.25):
							self.player_right.paddle_height *= 0.9
							self.player_right.currentShrinkPaddle += 1
							if (self.player_right.highestShrinkPaddle < self.player_right.currentShrinkPaddle):
								self.player_right.highestShrinkPaddle = self.player_right.currentShrinkPaddle
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
						await ball.bounce_methods.BouncePaddle(ball, left_paddle.position.x, left_paddle.position.y)
						if (self.ball.highestSpeed < ball.speed):
							self.ball.highestSpeed = ball.speed
						self.logger.info(f"Ball speed : {ball.speed}")

						if (self.event.name == 'Shrinking Paddles' and self.player_left.paddle_height > 2.25):
							self.player_left.paddle_height *= 0.9
							self.player_left.currentShrinkPaddle += 1
							if (self.player_left.highestShrinkPaddle < self.player_left.currentShrinkPaddle):
								self.player_left.highestShrinkPaddle = self.player_left.currentShrinkPaddle
							self.event.action = 'shrinkLeft'
						ball.lastHitter = "LEFT"  # Add this line
						paddle_hit = True

		if not paddle_hit:
			if ball_pos.x >= self.bounds.right.x:
				if (self.event.name == 'Killer Ball'):
					random_angle(ball)
					ball.position.x = ball.bounds.right.x - ball.radius
					if (self.ball.highestSpeed < ball.speed):
						self.ball.highestSpeed = ball.speed
					self.ball.lastHitter = "RIGHT"
					self.logger.info(f"Ball speed : {ball.speed}")
				else:
					await self.on_score("LEFT")
			elif ball_pos.x <= self.bounds.left.x:
				if (self.event.name == 'Killer Ball'):
					random_angle(ball)
					if (self.ball.highestSpeed < ball.speed):
						self.ball.highestSpeed = ball.speed
					ball.position.x = ball.bounds.left.x + ball.radius
					self.ball.lastHitter = "LEFT"
					self.logger.info(f"Ball speed : {ball.speed}")
				else:
					await self.on_score("RIGHT")

	async def on_score(self, winner):
		self.logger.info('on score called')
		self.event.revert()
		self.logger.info('on score event after revert')
		await self.revert_event_fun()
		self.logger.info('on score event after async revert')
		self.event = self.get_event()
		self.event.apply()
		self.logger.info('on score event after')

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
		self.player_right.position.x = self.bounds.right.x - 2
		self.player_right.position.y = -3+10.5
		self.player_right.position.z = -15
		self.player_left.position.x = self.bounds.left.x + 2
		self.player_left.position.y = -3+10.5
		self.player_left.position.z = -15
		self.ball.visible = False
		self.ball.is_moving = False
		self.ball.countdown = 5
		self.scored = True
		await self.achievement_checker_fun()

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
				if (self.ball.countdown >= 0.3):
					self.player_left.movable = False
					self.player_right.movable = False
				else:
					self.player_left.movable = True
					self.player_right.movable = True

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
			(InvertedControlsEvent(self), self.event_weights["InvertedControlsEvent"]),
			(RandomBouncesEvent(self), self.event_weights["RandomBouncesEvent"]),
			(MirrorBallEvent(self), self.event_weights["MirrorBallEvent"]),
			(LightsOutEvent(self), self.event_weights["LightsOutEvent"]),
			(InvisibilityFieldEvent(self), self.event_weights["InvisibilityFieldEvent"]),
			(InfiniteSpeedEvent(self), self.event_weights["InfiniteSpeedEvent"]),
			(ReverseBallEvent(self), self.event_weights["ReverseBallEvent"]),
			(ShrinkingPaddleEvent(self), self.event_weights["ShrinkingPaddleEvent"]),
			(IcyPaddlesEvent(self), self.event_weights["IcyPaddlesEvent"]),
			(NoStoppingEvent(self), self.event_weights["NoStoppingEvent"]),
			(VisibleTrajectoryEvent(self), self.event_weights["VisibleTrajectoryEvent"]),
			(KillerBallEvent(self), self.event_weights["KillerBallEvent"]),
			(BreathingTimeEvent(self), self.event_weights["BreathingTimeEvent"]),
			(SupersonicBallEvent(self), self.event_weights["SupersonicBallEvent"]),
			(RampingBallEvent(self), self.event_weights["RampingBallEvent"])
		]
		
		total_weight = sum(weight for _, weight in events)
		cumulative_weights = []
		cumulative_sum = 0

		for event, weight in events:
			cumulative_sum += weight
			cumulative_weights.append((cumulative_sum, event))
		
		random_choice = random.uniform(0, total_weight)

		for cumulative_weight, event in cumulative_weights:
			if random_choice <= cumulative_weight:
				if (self.event_weights[self.get_event_name(event)] / 2 <= 1):
					self.event_weights[self.get_event_name(event)] = 1
				else:
					self.event_weights[self.get_event_name(event)] /= 2
				return event

		return None

	def get_event_name(self, event):

		return event.__class__.__name__
