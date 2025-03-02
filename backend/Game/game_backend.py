import asyncio
import time
import logging
import json
from .normal_game_logic import ClassicGameInstance, GameBounds
from .rumble_game_logic import RumbleGameInstance, GameBounds
from channels.db import database_sync_to_async
from .bot import Bot
from api.db_utils import finish_game_history, user_update_game, delete_game_history, get_user_preference, get_user_statistic, unlock_achievement, update_achievement_progression, update_game_history_player_right
from datetime import datetime
import redis
import math
from channels.layers import get_channel_layer
from copy import deepcopy

class User:
	def __init__(self, user, channel, state):
		self.user = user
		self.channel = channel
		self.state = state

class GameBackend:
	def __init__(self, room_id, bot, manager, ranked, mode, tournament, local):
		self.logger = logging.getLogger('game')
		self.logger.info(f"Creating game in GameBackend with id {room_id}")
		self.game_id = room_id
		self.game_mode = mode
		self.tournament = tournament
		self.local = True if local else False
		self.game = self.get_game_instance(self.game_mode)
		self.is_ranked = ranked
		self.channel_layer = None
		self.manager = manager
		if (self.local):
			self.bot = 1
			self.bot_game = True
		else:
			self.bot = bot
			self.bot_game = bot > 0
		self.player_left = None
		self.player_right = None
		self.elo_change = 0
		self.remontada = None
		self.bigRemontada = None
		self.elo_k_factor = 40


		if (self.bot_game):
			self.logger.info(f'Creating a game with a bot, difficulty : {bot}')
		else:
			self.logger.info("Creating a game without bot")

		self.logger.info(f"Game Ranked ? {self.is_ranked} Tournament ? {self.tournament} local ? {self.local} bot ? {bot > 0}")

		if (bot > 0 and not self.local):
			self.player_right = Bot(bot, self.game, None)
		self.logger.info(f"{self.is_ranked is False} and {bot}")
		from Chat.consumer import ChatConsumer
		self.chat_consumer = ChatConsumer

	def handle_key_event(self, websocket, key, is_down):
		if websocket == self.player_left.channel:
			if (self.local):
				self.logger.info(f"Received key input for player left : {key} is down {is_down}")
				if key == "W" or key == "S":
					self.game.player_left.keys[key] = is_down
					self.logger.info(f"Key assigned to player left")
				else:
					self.game.player_right.keys[key] = is_down
					self.logger.info(f"Key assigned to player right")
			else:
				self.game.player_left.keys[key] = is_down
		elif websocket == self.player_right.channel:
			self.game.player_right.keys[key] = is_down

	def get_game_instance(self, mode):
		if (mode == "classic"):
			return ClassicGameInstance(self.broadcast_state, self.on_game_end, self.check_classic_achievement, self.tournament, self.local)
		elif (mode == "rumble"):
			return RumbleGameInstance(self.rumble_broadcast_state, self.rumble_revert_event_broadcast, self.on_game_end, self.check_rumble_achievement, self.tournament, self.local)
		else:
			self.logger.error("Game mode not found")

	def is_full(self):
		return (self.player_left is not None and self.player_right is not None)

	async def start_game(self):
		if self.is_full() and not self.game.is_running:
			self.player_left.state = "Playing"
			self.player_right.state = "Playing"
			if (self.bot > 0):
				self.logger.info("started game with a bot")
				if not self.local:
					self.player_right.start_bot()
			else:
				await update_game_history_player_right(self.game_id, self.player_right.user)
				self.logger.info("started game with a player")
			self.game.start()
		else:
			self.logger.warning("start game caleld but game is not full")

	def stop_game(self):
		self.game.stop()

	async def player_disc(self, user):
		if (self.player_left and self.player_left.user.id == user.id and not self.game.ended):
			self.logger.info("Player left disconnected, calling forfeit")
			await self.game.forfeit("LEFT")
		elif (self.player_right and self.player_right.user.id == user.id and not self.game.ended):
			self.logger.info("Player right disconnected, calling forfeit")
			await self.game.forfeit("RIGHT")
		else:
			self.logger.warning("Player disc called but user not found")

	def player_in_game(self, user):
		if (self.player_left and self.player_left.user.id == user.id):
			return True
		elif (self.player_right and self.player_right.user.id == user.id):
			return True
		return False

	async def disconnect_user(self, user):
		old_channel = None
		if (self.player_left and self.player_left.user.id == user.id):
			old_channel = self.player_left.channel
			self.player_left = None
		elif (self.player_right and self.player_right.user.id == user.id):
			old_channel = self.player_right.channel
			self.player_right = None
		return old_channel

	def assign_player(self, user, channel):
		if not self.player_left or self.player_left.user.id == user.id:
			self.player_left = User(user, channel, "Connected")
			self.logger.info(f"Creating user for player left {self.player_left.user.username}")
			if (self.local):
				self.player_right = Bot(0, self.game, user)

		elif not self.player_right or self.player_right.user.id == user.id:
			self.player_right = User(user, channel, "Connected")
			self.logger.info(f"Creating user for player right {self.player_right.user.username}")
		else:
			raise Exception("Error : assign player when two player were in a game")

	async def set_player_init(self, channel):
			self.logger.info('init called')
			if (self.player_left.channel == channel):
				self.logger.info('inisaddsat calasddasled')
				self.logger.info(f"is bot game {self.bot > 0}")
				self.player_left.state = "Ready"
				await self.check_ready_game()
			elif self.bot > 0:
				self.logger.info('inisadasdsadasdsat called')
				await self.check_ready_game()
			elif (self.player_right.channel == channel):
				self.logger.info('inisaddsat calasdasled')
				self.logger.info(f"is bot game {self.bot > 0}")
				self.player_right.state = "Ready"
				await self.check_ready_game()
			else:
				self.logger.info('inisaddsat called')
				self.logger.warning("Received player init but couldnt match channel")

	async def check_ready_game(self):
		self.logger.info('check called')
		if (self.player_left and self.player_left.state == "Ready" and (self.bot > 0 or (self.player_right and self.player_right.state == "Ready"))):
			self.logger.info("Both player ready, starting")
			await self.start_game()
		else:
			self.logger.info("Not starting, both player not ready yet")

	async def on_game_end(self):
		try:
			if (self.is_ranked):
				await self.update_elo(self.game.winner)
				player_right_statistic = await get_user_statistic(self.player_right.user)
				player_left_statistic = await get_user_statistic(self.player_left.user)
				self.logger.info(f"player_left_statistic {player_left_statistic.classic_wins}")
				self.logger.info(f"player_right_statistic {player_right_statistic.classic_wins}")

			if self.game.winner == "LEFT":
				self.game.winner = self.player_left.user
				if (self.is_ranked and self.game_mode == "classic"):
					await self.update_user_statistic_classic_wins(player_left_statistic)
				elif (self.is_ranked and self.game_mode == "rumble"):
					await self.update_user_statistic_rumble_wins(player_left_statistic)
			elif self.game.winner == "RIGHT":
				self.game.winner = self.player_right.user
				if (self.is_ranked and self.game_mode == "classic"):
					await self.update_user_statistic_classic_wins(player_right_statistic)
				elif (self.is_ranked and self.game_mode == "rumble"):
					await self.update_user_statistic_rumble_wins(player_right_statistic)

			if (self.is_ranked and self.game_mode == "classic"):
				await self.update_user_statistic_classic_total_played(player_left_statistic)
				await self.update_user_statistic_classic_total_played(player_right_statistic)
			elif (self.is_ranked and self.game_mode == "rumble"):
				await self.update_user_statistic_rumble_total_played(player_left_statistic)
				await self.update_user_statistic_rumble_total_played(player_right_statistic)

			if (self.bot > 0 ):
				await delete_game_history(self.game_id)
			else:
				await finish_game_history(self.game_id, self.game.player_left.score, self.game.player_right.score, self.elo_change, self.game.winner)

			if self.game_mode == "classic":
				await self.broadcast_state()
			else:
				await self.rumble_broadcast_state()

			if self.player_left:
				self.logger.info(f"Resetting left player: {self.player_left.user.username}")
				await user_update_game(self.player_left.user, False, game_id=-1)

			if self.player_right and self.bot == 0:
				self.logger.info(f"Resetting right player: {self.player_right.user.username}")
				await user_update_game(self.player_right.user, False, game_id=-1)

			if self.tournament:
				from .tournament import Tournament
				tournament = Tournament.get_instance()
				self.logger.info(f"Game ended in tournament mode, calling gameEnded in tournament, winner is {self.game.winner.username}")
				await tournament.gameEnded(self.game_id, self.game.player_left.score, self.game.player_right.score, self.game.winner)
			else:
				self.manager.remove_game(self.game_id)
				game_history_db = await self.manager.get_game_by_id(self.game_id)
				await self.manager.set_game_state(game_history_db, 'finished', self.game.player_left.score, self.game.player_right.score)

		except Exception as e:
			self.logger.error(f"Error in on_game_end: {str(e)}")
			import traceback
			self.logger.error(traceback.format_exc())

	async def update_elo(self, winner):
		player_left_statistic = await get_user_statistic(self.player_left.user)
		player_right_statistic = await get_user_statistic(self.player_right.user)

		if (self.game_mode == "classic"):
			elo_pleft = player_left_statistic.classic_elo
			elo_pright = player_right_statistic.classic_elo
		elif (self.game_mode == "rumble"):
			elo_pleft = player_left_statistic.rumble_elo
			elo_pright = player_right_statistic.rumble_elo

		expected_score_pleft = 1 / (1 + 10 ** ((elo_pright - elo_pleft) / 400))
		expected_score_pright = 1 - expected_score_pleft

		if (winner == "LEFT"):
			actual_score_pleft = 1
			actual_score_pright = 0
		elif (winner == "RIGHT"):
			actual_score_pleft = 0
			actual_score_pright = 1
		else:
			self.logger.error("update elo but winner is neither left or right")
			return 0

		new_elo_pleft = math.ceil(elo_pleft + self.elo_k_factor * (actual_score_pleft - expected_score_pleft))
		new_elo_pright = math.ceil(elo_pright + self.elo_k_factor * (actual_score_pright - expected_score_pright))

		left_change = abs(new_elo_pleft - elo_pleft)
		right_change = abs(new_elo_pright - elo_pright)

		self.elo_change = math.ceil((left_change + right_change) / 2)

		if (winner == "LEFT"):
			new_elo_pleft = elo_pleft + self.elo_change
			new_elo_pright = elo_pright - self.elo_change
		else:
			new_elo_pleft = elo_pleft - self.elo_change
			new_elo_pright = elo_pright + self.elo_change

		if (self.game_mode == "classic"):
			await self.update_user_statistic_classic_elo(player_left_statistic, new_elo_pleft)
			await self.update_user_statistic_classic_elo(player_right_statistic, new_elo_pright)
		elif (self.game_mode == "rumble"):
			await self.update_user_statistic_rumble_elo(player_left_statistic, new_elo_pleft)
			await self.update_user_statistic_rumble_elo(player_right_statistic, new_elo_pright)

	async def get_color(self, user):
		color_map = {
			0: '#447AFF',
			1: "#00BDD1",
			2: "#00AD06",
			3: "#E67E00",
			4: "#E6008F",
			5: "#6900CC",
			6: "#E71200",
			7: "#0EC384",
			8: "#E6E3E1",
			9: "#D5DA2B"
		}
		try:
			user_preference = await get_user_preference(user)
			color = color_map.get(user_preference.color)
			if (color is None):
				return "#00BDD1"
			else:
				return color
		except:
			return "#00BDD1"

	async def broadcast_state(self):
		events = []
		if self.game.scored:
			if self.game.scorer is not None:
				if (self.game.scorer == "LEFT"):
					color = await self.get_color(self.player_left.user)
				elif self.game.scorer == "RIGHT":
					color = await self.get_color(self.player_right.user)
				else:
					self.logger.info(f"color defaulted to grey cause winner is not left or right")
					color = '#676a6e'
				self.game.scorer = None
			else:
				self.logger.info(f"color defaulted to grey cause winner is none")
				color = '#676a6e'
			events.append({
			"type": "score",
			"position": vars(self.game.scorePos),
			"score_left": self.game.player_left.score,
			"score_right": self.game.player_right.score,
			"color" : color
			})
			self.game.scored = False
		if self.game.ended:
			avatar = self.getUserAvatar(self.game.winner)
			username = self.getUserName(self.game.winner)
			if self.game.winner is self.player_left.user:
				side = "LEFT"
			elif self.game.winner is self.player_right.user:
				side = "RIGHT"
			else:
				self.logger.info("Unknown winner")
			
			events.append({
				"type": "game_end",
				"winnerName": username,
				"winner" : side,
				"winnerUser" : self.game.winner.username,
				"winnerAvatar": avatar,
				"playerLeftUsername" : self.player_left.user.username,
				"playerLeftName" : self.getUserName(self.player_left.user),
				"playerLeftAvatar" : self.getUserAvatar(self.player_left.user),
				"scoreLeft": self.game.player_left.score,
				"playerRightUsername" : self.player_right.user.username,
				"playerRightName" : self.getUserName(self.player_right.user),
				"playerRightAvatar" : self.getUserAvatar(self.player_right.user),
				"scoreRight": self.game.player_right.score,
				"eloChange": self.elo_change,
				"tournament": self.tournament,
				"gameMode": self.game_mode,
				"ranked": self.is_ranked,
				"bot": self.bot > 0
		})
		if self.game.ball.lastHitter is not None:
			if (self.game.ball.lastHitter == "LEFT"):
				color = await self.get_color(self.player_left.user)
			elif self.game.ball.lastHitter == "RIGHT":
				color = await self.get_color(self.player_right.user)
			else:
				color = '#676a6e'
			events.append({"type": "ball_last_hitter", "color": color})

		trajectory_data = []

		ballX = self.game.ball.position.x
		ball_pos = vars(self.game.ball.position)
		state = {
			"type": "game.update",
			"data": {
				"positions": {
					"player_left": vars(self.game.player_left.position),
					"player_right": vars(self.game.player_right.position),
					"ball": ball_pos,
				},
				"keys": {
                "player_left": self.map_key_state(self.game.player_left.keys),
                "player_right": self.map_key_state(self.game.player_right.keys)
           		 },
				"trajectory": trajectory_data,
				"events": events
			}
		}
		try:
			await self.channel_layer.group_send(str(self.game_id), state)
		except Exception as e:
			self.logger.info(f"Error {e}")

	def getUserAvatar(self, user):
		if (user.avatar_42):
			return user.avatar_42
		elif (user.avatar):
			return user.avatar.url
		else:
			return '/imgs/default_avatar.png'
	
	def getUserName(self, user):
		if (user.display_name):
			return user.display_name
		else:
			return user.username

	async def rumble_broadcast_state(self):
		events = []
		if self.game.scored:
			if self.game.scorer is not None:
				if (self.game.scorer == "LEFT"):
					color = await self.get_color(self.player_left.user)
				elif self.game.scorer == "RIGHT":
					color = await self.get_color(self.player_right.user)
				else:
					self.logger.info(f"color defaulted to grey cause winner is not left or right")
					color = '#676a6e'
				self.game.scorer = None
			else:
				self.logger.info(f"color defaulted to grey cause winner is none")
				color = '#676a6e'
			events.append({
			"type": "score",
			"position": vars(self.game.scorePos),
			"score_left": self.game.player_left.score,
			"score_right": self.game.player_right.score,
			"color" : color
			})
			self.game.scored = False
		if self.game.ended:
			avatar = self.getUserAvatar(self.game.winner)
			username = self.getUserName(self.game.winner)
			if self.game.winner is self.player_left.user:
				side = "LEFT"
			elif self.game.winner is self.player_right.user:
				side = "RIGHT"
			else:
				self.logger.info("Unknown winner")

			events.append({
				"type": "game_end",
				"winnerName": username,
				"winner" : side,
				"winnerUser" : self.game.winner.username,
				"winnerAvatar": avatar,
				"playerLeftUsername" : self.player_left.user.username,
				"playerLeftName" : self.getUserName(self.player_left.user),
				"playerLeftAvatar" : self.getUserAvatar(self.player_left.user),
				"scoreLeft": self.game.player_left.score,
				"playerRightUsername" : self.player_right.user.username,
				"playerRightName" : self.getUserName(self.player_right.user),
				"playerRightAvatar" : self.getUserAvatar(self.player_right.user),
				"scoreRight": self.game.player_right.score,
				"eloChange": self.elo_change,
				"tournament": self.tournament,
				"gameMode": self.game_mode,
				"ranked": self.is_ranked,
				"bot": self.bot > 0

		})
		if self.game.announceEvent or self.game.event.action != 'none':
			self.logger.info(f"Announcing event {self.game.event.name} and {self.game.event.description}")
			events.append({
				"type": "event",
				"icon": self.game.event.icon,
				"announce" : self.game.announceEvent,
				"name": self.game.event.name,
				"description": self.game.event.description,
				"action": self.game.event.action,
		})
		self.game.event.action = 'none'
		if (self.game.announceEvent):
			self.game.announceEvent = False
		if self.game.ball.lastHitter is not None:
			if (self.game.ball.lastHitter == "LEFT"):
				color = await self.get_color(self.player_left.user)
			elif self.game.ball.lastHitter == "RIGHT":
				color = await self.get_color(self.player_right.user)
			else:
				color = '#676a6e'
			events.append({"type": "ball_last_hitter", "color": color})

		if (self.game.event.name == 'Visible Trajectory'):
			trajectory_points = self.game.ball.predict_trajectory()
			trajectory_data = [vars(point) for point in trajectory_points]
		else:
			trajectory_data = []

		ballX = self.game.ball.position.x

		if (self.game.event.name == 'Invisibility Field' and ballX >= -6 and ballX <= 6):
			ball_pos = {
				"x": 1000,
				"y": 1000,
				"z": 1000
			}
		else:
			ball_pos = vars(self.game.ball.position)
		state = {
			"type": "game.update",
			"data": {
				"positions": {
					"player_left": vars(self.game.player_left.position),
					"player_right": vars(self.game.player_right.position),
					"ball": ball_pos,
				},
				 "keys": {
                "player_left": self.map_key_state(self.game.player_left.keys),
                "player_right": self.map_key_state(self.game.player_right.keys)
            		},
				"trajectory": trajectory_data,
				"events": events
			}
		}
		try:
			await self.channel_layer.group_send(str(self.game_id), state)
		except Exception as e:
			self.logger.info(f"Error {e}")

	async def rumble_revert_event_broadcast(self):
		events = []
		if (self.game.event.action != 'none'):
			action = self.game.event.action
			self.game.event.action = 'none'
			events.append({
				"type": "event",
				"icon": self.game.event.icon,
				"name": self.game.event.name,
				"announce" : False,
				"description": self.game.event.description,
				"action": action,
			})
			state = {
				"type": "game.update",
				"data": {
					"events": events
				}
			}
		try:
			await self.channel_layer.group_send(str(self.game_id), state)
		except Exception as e:
			self.logger.info(f"Error {e}")

	def map_key_state(self, keys):
		key_states = []
		if keys.get("ArrowUp", False) or keys.get("W", False):
			key_states.append("UP")
		if keys.get("ArrowDown", False) or keys.get("S", False):
			key_states.append("DOWN")
		return key_states

	async def check_classic_achievement(self):
		if (self.is_ranked or self.tournament):
			await self.check_remontada()
			await self.check_big_remontada()
			await self.check_flawless_victory()
			await self.check_classic_win()
			await self.check_wins()
	
	async def check_rumble_achievement(self):
		if (self.is_ranked or self.tournament):
			await self.check_remontada()
			await self.check_big_remontada()
			await self.check_flawless_victory()
			await self.check_rumble_win()
			await self.check_wins()
			await self.check_speed_of_light()
			await self.check_killer_survivor()
			await self.check_shrinking_paddle()
	
	async def check_remontada(self):
		if (self.remontada is None):
			if (self.game.ended is False and self.game.player_left.score + 3 < self.game.player_right.score):
				self.remontada = self.player_left.user
				self.logger.info("Player left elligible for Clutch")
			elif (self.game.ended is False and self.game.player_right.score + 3 < self.game.player_left.score):
				self.remontada = self.player_right.user
				self.logger.info("Player right elligible for Clutch")
		elif self.game.ended and self.remontada:
			if (self.game.winner == 'LEFT' and self.remontada == self.player_left.user):
				await unlock_achievement(self.remontada, "Clutch")
			elif (self.game.winner == 'RIGHT' and self.remontada == self.player_right.user):
				await unlock_achievement(self.remontada, "Clutch")
	
	async def check_big_remontada(self):
		if (self.bigRemontada is None):
			if (self.game.ended is False and self.game.player_left.score + 6 < self.game.player_right.score):
				self.bigRemontada = self.player_left.user
				self.logger.info("Player left elligible for God's Clutch")
			elif (self.game.ended is False and self.game.player_right.score + 6 < self.game.player_left.score):
				self.bigRemontada = self.player_right.user
				self.logger.info("Player left elligible for God's Clutch")
		elif self.game.ended and self.bigRemontada:
			if (self.game.winner == 'LEFT' and self.bigRemontada == self.player_left.user):
				await unlock_achievement(self.bigRemontada, "God's Clutch")
			elif (self.game.winner == 'RIGHT' and self.bigRemontada == self.player_right.user):
				await unlock_achievement(self.bigRemontada, "God's Clutch")

	async def check_flawless_victory(self):
		if (self.game.ended):
			if (self.game.winner == 'LEFT' and self.game.player_left.score == 10 and self.game.player_right.score == 0):
				await unlock_achievement(self.player_left.user, "Flawless")
			elif (self.game.winner == 'RIGHT' and self.game.player_right.score == 10 and self.game.player_left.score == 0):
				await unlock_achievement(self.player_right.user, "Flawless")
	
	async def check_speed_of_light(self):
		if (self.game.ended and self.game.ball.highestSpeed < 60 and math.floor(self.game.ball.highestSpeed) > 0):
			await update_achievement_progression(self.player_right.user, 'Speed Of Light', math.floor(self.game.ball.highestSpeed))
			await update_achievement_progression(self.player_left.user, 'Speed Of Light', math.floor(self.game.ball.highestSpeed))
		elif (self.game.ended and self.game.ball.highestSpeed >= 60):
			await unlock_achievement(self.player_right.user, "Speed Of Light")
			await unlock_achievement(self.player_right.user, "Speed Of Light")
	
	async def check_killer_survivor(self):
		if (self.game.ended and self.game.highestKillerSurvive < 42 and math.floor(self.game.highestKillerSurvive)> 0):
			await update_achievement_progression(self.player_right.user, 'Survivor', math.floor(self.game.highestKillerSurvive))
			await update_achievement_progression(self.player_left.user, 'Survivor', math.floor(self.game.highestKillerSurvive))
		elif (self.game.ended and self.game.highestKillerSurvive >= 42):
			await unlock_achievement(self.player_left.user, "Survivor")
			await unlock_achievement(self.player_right.user, "Survivor")

	async def check_shrinking_paddle(self):
		if (self.game.ended and self.game.player_right.highestShrinkPaddle < 8 and self.game.player_right.highestShrinkPaddle > 0):
			await update_achievement_progression(self.player_right.user, 'Honey, I Shrunk the Paddles', self.game.player_right.highestShrinkPaddle)
		if (self.game.ended and self.game.player_left.highestShrinkPaddle < 8 and self.game.player_left.highestShrinkPaddle > 0):
			await update_achievement_progression(self.player_left.user, 'Honey, I Shrunk the Paddles', self.game.player_left.highestShrinkPaddle)
		if (self.game.ended and self.game.player_right.highestShrinkPaddle >= 8):
			await unlock_achievement(self.player_right.user, 'Honey, I Shrunk the Paddles')
		if (self.game.ended and self.game.player_left.highestShrinkPaddle >= 8):
			await unlock_achievement(self.player_left.user, 'Honey, I Shrunk the Paddles')
			
	async def check_rumble_win(self):
		if (self.game.ended and self.game.winner =='LEFT'):
			await unlock_achievement(self.player_left.user, 'Rumbler')
		elif (self.game.ended and self.game.winner == 'RIGHT'):
			await unlock_achievement(self.player_right.user, 'Rumbler')
		else:
			self.logger.info("Rubmble game not won by anyone or not ended")

	async def check_classic_win(self):
		if (self.game.ended and self.game.winner =='LEFT'):
			await unlock_achievement(self.player_left.user, 'Vanilla')
		elif (self.game.ended and self.game.winner == 'RIGHT'):
			await unlock_achievement(self.player_right.user, 'Vanilla')
	
	async def check_wins(self):
		if (self.game.ended and self.game.winner =='LEFT'):
			user_stat = await get_user_statistic(self.player_left.user)
			if (user_stat.classic_wins + user_stat.rumble_wins + 1 < 10):
				await update_achievement_progression(self.player_left.user, 'Challenger', user_stat.classic_wins + user_stat.rumble_wins + 1)
			else:
				await unlock_achievement(self.player_right.user, 'Challenger')
		elif (self.game.ended and self.game.winner =='RIGHT'):
			user_stat = await get_user_statistic(self.player_right .user)
			if (user_stat.classic_wins + user_stat.rumble_wins + 1 < 10):
				await update_achievement_progression(self.player_right.user, 'Challenger', user_stat.classic_wins + user_stat.rumble_wins + 1)
			else:
				await unlock_achievement(self.player_right.user, 'Challenger')


	@database_sync_to_async
	def update_user_statistic_classic_elo(self, user_statistic, elo):
		from api.models import UserStatistic
		user_statistic.classic_elo = elo
		user_statistic.save()

	@database_sync_to_async
	def update_user_statistic_rumble_elo(self, user_statistic, elo):
		from api.models import UserStatistic
		user_statistic.rumble_elo = elo
		user_statistic.save()

	@database_sync_to_async
	def update_user_statistic_classic_wins(self, user_statistic):
		from api.models import UserStatistic
		user_statistic.classic_wins += 1
		user_statistic.save()

	@database_sync_to_async
	def update_user_statistic_rumble_wins(self, user_statistic):
		from api.models import UserStatistic
		user_statistic.rumble_wins += 1
		user_statistic.save()

	@database_sync_to_async
	def update_user_statistic_classic_total_played(self, user_statistic):
		from api.models import UserStatistic
		user_statistic.classic_total_played += 1
		user_statistic.save()

	@database_sync_to_async
	def update_user_statistic_rumble_total_played(self, user_statistic):
		from api.models import UserStatistic
		user_statistic.rumble_total_played += 1
		user_statistic.save()