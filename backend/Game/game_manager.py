from typing_extensions import List
from .game_backend import GameBackend
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.db.models import Q
import logging
from time import sleep

class GameManager:
	_instance = None
	
	@classmethod
	def get_instance(cls):
		if cls._instance is None:
			cls._instance = GameManager()
		return cls._instance

	def __init__(self):
		if GameManager._instance is not None:
			raise Exception("This class is a singleton!")
		else:
			GameManager._instance = self
			self.game_history = None
			self.games = {}
			self.logger = logging.getLogger('game')
			self.tournament_count = 0

	def _get_game_history_model(self):
		if self.game_history is None:
			from api.models import GameHistory
			from Chat.consumer import ChatConsumer
			self.game_history = GameHistory
			self.chat_consumer = ChatConsumer

	def remove_game(self, game_id):
		if game_id in self.games:
			game = self.games[game_id]
			del self.games[game_id]

	async def get_game(self, user, bot, mode, ranked=True, local=False):
		self._get_game_history_model()
		self.logger.info(f"Getting game for user {user.username}")
		game = None
		if (bot == 0 and not local):
			game = await self.check_available_game(mode)
		if (game is None):
			game = await self.create_game(user, bot, mode, ranked, local)
		return (game)

	def get_player_current_game(self, user):
		#TODO uncomment
		#self.logger.info(f"currentGame {user.current_game_id}")
		#self.logger.info(self.games)
		#if (user.playing and self.games and self.games[user.current_game_id]):
		#	return (self.games[user.current_game_id])
	#	if user.current_game_id != -1:
		#		return self.games.get(user.current_game_id, None)
		return None

	async def check_available_game(self, mode):
		games = await self.get_waiting_game(mode)
		if (await self.is_game_exists(games)):
			game = await self.get_first_game(games)
			await self.set_game_state(game, 'playing')
			return self.games[game.id]
		return None

	async def create_game(self, user, bot, mode, ranked, local):
		self._get_game_history_model()
		if (bot == 0 and not local):
			game_id = (await self.create_game_history(user, game_mode=mode)).id
		else:
			game_id = (await self.create_game_history(user, game_type='AI', game_mode=mode)).id
		if (local):
			local = True
		else:
			local = False
		self.games[game_id] = GameBackend(game_id, bot, self, ranked and bot == 0 and local == False, mode, False, local)
		return self.games[game_id]

	async def create_tournament_empty_games(self, tournament_info):
		self.tournament_count += 1
		self._get_game_history_model()
		p1 = tournament_info["round1"][f"game1"]["p1"]
		p2 = tournament_info["round1"][f"game1"]["p2"]
		p3 = tournament_info["round1"][f"game2"]["p1"]
		p4 = tournament_info["round1"][f"game2"]["p2"]
		game_id3 = (await self.create_game_history(None, None, game_type='Tournament2', tournament_count=self.tournament_count)).id
		game_id1 = (await self.create_game_history(await self.get_user(p1), await self.get_user(p2), game_type='Tournament1', tournament_count=self.tournament_count, tournament_round2_game_id=game_id3, tournament_round2_place=1)).id
		game_id2 = (await self.create_game_history(await self.get_user(p3), await self.get_user(p4), game_type='Tournament1', tournament_count=self.tournament_count, tournament_round2_game_id=game_id3, tournament_round2_place=2)).id
		print(f"3games created {game_id1}, {game_id2}, {game_id3}, players: {p1}, {p2}, {p3}, {p4}", flush=True)

	@database_sync_to_async
	def get_waiting_game(self, game_mode):
		return self.game_history.objects.filter(game_state='waiting', game_mode=game_mode)

	@database_sync_to_async
	def get_invite_game(self, player_left, player_right, game_type='Invite'):
		game = self.game_history.objects.filter(player_left=player_left, player_right=player_right, game_state='waiting', game_type=game_type)
		if not game.exists():
			self.logger.info("Waiting for the game to be created")
			sleep(0.5)
			game = self.game_history.objects.filter(player_left=player_left, player_right=player_right, game_state='waiting', game_type=game_type)
		return game.first()

	@database_sync_to_async
	def get_tournament_game(self, p1, p2, game_type='Tournament1'):
		game = self.game_history.objects.filter(player_left=p1, player_right=p2, game_state='waiting', game_type=game_type)
		return game.first()

	@database_sync_to_async
	def create_game_history(self, player_left, player_right=None, game_type='ranked', game_mode='classic', game_state='waiting', tournament_count=0, tournament_round2_game_id=-1, tournament_round2_place=-1):
		return self.game_history.objects.create(player_left=player_left, player_right=player_right, game_type=game_type, game_mode=game_mode, game_state=game_state, tournament_count=tournament_count, tournament_round2_game_id=tournament_round2_game_id, tournament_round2_place=tournament_round2_place)

	@database_sync_to_async
	def save_game_history(self, game_history):
		game_history.save()

	#@database_sync_to_async
	#def tournament_player(self, user):
	#	return self.game_history.objects.filter(
	#		game_state='waiting',
	#		game_type='tournament',
	#		player_left=user
	#	) | self.game_history.objects.filter(
	#		game_state='waiting',
	#		game_type='tournament',
	#		player_right=user
	#	)
	
	#@database_sync_to_async
	#def tournament_player(self, user):
	#	game = self.game_history.objects.filter(
	#		game_state='waiting',
	#		game_type='tournament',
	#		player_left=user)
	#	if not game.exists():
	#		game = self.game_history.objects.filter(
	#			game_state='waiting',
	#			game_type='tournament',
	#			player_right=user
	#		)
	#	return game

	@database_sync_to_async
	def tournament_player(self, user):
		game = self.game_history.objects.filter(
			game_state='waiting',
			game_type='tournament',
			player_left=user
		).values_list('id', flat=True).first()
		if not game:
			game = self.game_history.objects.filter(
				game_state='waiting',
				game_type='tournament',
				player_right=user
			).values_list('id', flat=True).first()
		return game
		

	@database_sync_to_async
	def is_game_exists(self, games):
		return games.exists()

	@database_sync_to_async
	def get_first_game(self, games):
		return games.first()

	@database_sync_to_async
	def set_game_state(self, game, game_state, score_left = 0, score_right = 0, player_left = None, player_right = None):
		game.score_left = score_left
		game.score_right = score_right
		game.game_state = game_state
		if player_left:
			game.player_left = player_left
		if player_right:
			game.player_right = player_right
		game.save()

	@database_sync_to_async
	def get_game_by_id(self, game_id):
		return self.game_history.objects.get(id=game_id)

	@database_sync_to_async
	def get_user(self, username):
		User = get_user_model()
		user = User.objects.get(username=username)
		return user