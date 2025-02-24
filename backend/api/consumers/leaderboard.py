from channels.generic.http import AsyncHttpConsumer
from django.contrib.auth import get_user_model
from channels.db import database_sync_to_async
from api.utils import jwt_to_user, get_user_avatar_url, get_users_with_stats, sort_leaderboard
from api.db_utils import sendResponse, sendBadJWT
import json

class LeaderboardConsumer(AsyncHttpConsumer):
	async def handle(self, body):
		try:
			user = await jwt_to_user(self.scope['headers'])
			if not user:
				return await sendBadJWT(self)

			game_mode = self.scope['url_route']['kwargs']['game_mode']
			users = await get_users_with_stats(game_mode, self.scope['headers'])

			response_data = {
				'success': True,
				'leaderboard': sort_leaderboard(users)  
			}
			return await self.send_response(200, json.dumps(response_data).encode(),
				headers=[(b"Content-Type", b"application/json")])

		except Exception as e:
			return await sendResponse(self, False, str(e), 500)