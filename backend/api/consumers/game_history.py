from channels.generic.http import AsyncHttpConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.db.models import Q
from django.utils import timezone
from django.utils.timesince import timesince
from api.utils import jwt_to_user, get_user_avatar_url
from api.db_utils import get_user, get_user_by_name
import json

class GameHistoryConsumer(AsyncHttpConsumer):
	async def handle(self, body):
		try:
			user = await jwt_to_user(self.scope['headers'])
			if not user:
				response_data = {
					'success': False,
					'is_jwt_valid': False,
					'message': 'Invalid JWT'
				}
				return await self.send_response(401, json.dumps(response_data).encode(),
					headers=[(b"Content-Type", b"application/json")])

			profile_user = await get_user_by_name(self.scope['url_route']['kwargs']['username'])
			if not profile_user:
				response_data = {
					'success': False,
					'message': 'User not found'
				}
				return await self.send_response(404, json.dumps(response_data).encode(),
					headers=[(b"Content-Type", b"application/json")])

			game_histories = await self.get_game_histories(profile_user)

			response_data = {
				'success': True,
			}

			for index, game_history in enumerate(game_histories):
				player_left =  await self.get_player_left(game_history)
				player_right =  await self.get_player_right(game_history)
				winner = await self.get_winner(game_history)
				time_since_game = timesince(game_history.updated_at, timezone.now())
				if not "," in time_since_game:
					time_since_game = time_since_game.split(",")[0]
				time_since_game = time_since_game.strip() + " ago"

				response_data[f"game_history_{index}"] = {
					'game_type': game_history.game_type,
					'game_mode': game_history.game_mode,
					'score_left': game_history.score_left,
					'score_right': game_history.score_right,
					'elo_change': game_history.elo_change,
					'time_since_game': time_since_game,
					'player_left': {
						'name': player_left.display_name if player_left.display_name is not None else player_left.username,
						'avatar_url': get_user_avatar_url(player_left, self.scope['headers']),
						'is_winner': player_left.id == winner.id,
					},
					'player_right': {
						'name': player_right.display_name if player_right.display_name is not None else player_right.username,
						'avatar_url': get_user_avatar_url(player_right, self.scope['headers']),
						'is_winner': player_right.id == winner.id,
					},
				}
			return await self.send_response(200, json.dumps(response_data).encode(),
				headers=[(b"Content-Type", b"application/json")])

		except Exception as e:
			response_data = {
				'success': False,
				'message': str(e)
			}
			return await self.send_response(500, json.dumps(response_data).encode(),
				headers=[(b"Content-Type", b"application/json")])

	@database_sync_to_async
	def get_player_left(self, game_history):
		User = get_user_model()
		return User.objects.get(id=game_history.player_left.id)

	@database_sync_to_async
	def get_player_right(self, game_history):
		User = get_user_model()
		return User.objects.get(id=game_history.player_right.id)

	@database_sync_to_async
	def get_winner(self, game_history):
		User = get_user_model()
		return User.objects.get(id=game_history.winner.id)

	@database_sync_to_async
	def get_game_histories(self, user):
		from api.models import GameHistory
		return list(GameHistory.objects.filter((Q(player_left=user) | Q(player_right=user)) & Q(game_state='finished'))
			.order_by('-created_at')[:20])

