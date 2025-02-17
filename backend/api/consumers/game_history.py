from channels.generic.http import AsyncHttpConsumer
from channels.db import database_sync_to_async
from django.db.models import Q
from api.utils import jwt_to_user, get_user_avatar_url
from api.db_utils import get_user, get_user_by_name
import json
import traceback
from django.contrib.auth import get_user_model

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
				player_a =  await self.get_player_a(game_history)
				player_b =  await self.get_player_b(game_history)
				winner = await self.get_winner(game_history)

				response_data[f"game_history_{index}"] = {
					'game_type': game_history.game_type,
					'score_a': game_history.score_a,
					'score_b': game_history.score_b,
					'elo_change': game_history.elo_change,
					'player_a': {
						'name': player_a.display_name if player_a.display_name is not None else player_a.username,
						'avatar_url': get_user_avatar_url(player_a, self.scope['headers']),
						'is_winner': player_a.id == winner.id,
					},
					'player_b': {
						'name': player_b.display_name if player_b.display_name is not None else player_b.username,
						'avatar_url': get_user_avatar_url(player_b, self.scope['headers']),
						'is_winner': player_b.id == winner.id,
					},
				}
			return await self.send_response(200, json.dumps(response_data).encode(),
				headers=[(b"Content-Type", b"application/json")])

		except Exception as e:
			response_data = {
				'success': False,
				'traceback': traceback.format_exc(),
				'message': str(e)
			}
			return await self.send_response(500, json.dumps(response_data).encode(),
				headers=[(b"Content-Type", b"application/json")])

	@database_sync_to_async
	def get_player_a(self, game_history):
		User = get_user_model()
		return User.objects.get(id=game_history.player_a.id)

	@database_sync_to_async
	def get_player_b(self, game_history):
		User = get_user_model()
		return User.objects.get(id=game_history.player_b.id)

	@database_sync_to_async
	def get_winner(self, game_history):
		User = get_user_model()
		return User.objects.get(id=game_history.winner.id)

	@database_sync_to_async
	def get_game_histories(self, user):
		from api.models import GameHistory
		return list(GameHistory.objects.filter((Q(player_a=user) | Q(player_b=user)) & Q(game_state='finished'))
			.order_by('-created_at')[:20])

