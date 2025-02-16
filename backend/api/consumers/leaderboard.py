from channels.generic.http import AsyncHttpConsumer
from django.contrib.auth import get_user_model
from channels.db import database_sync_to_async
from api.utils import jwt_to_user, get_user_avatar_url, get_users_with_stats, sort_leaderboard
import json

class LeaderboardConsumer(AsyncHttpConsumer):
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

			game_mode = self.scope['url_route']['kwargs']['game_mode']
			users = await get_users_with_stats(game_mode, self.scope['headers'])

			response_data = {
				'success': True,
				'leaderboard': sort_leaderboard(users)  
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