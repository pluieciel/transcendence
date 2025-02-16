from channels.generic.http import AsyncHttpConsumer
from django.contrib.auth import get_user_model
from channels.db import database_sync_to_async
from api.utils import jwt_to_user, get_user_avatar_url, get_winrate, sort_leaderboard
from api.db_utils import get_user_by_name, get_user_statistic, get_users
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
			users = await get_users()

			for user in users:
				db_user = await get_user_by_name(user['username'])
				user_statistic = await get_user_statistic(db_user)
				
				avatar_url = get_user_avatar_url(db_user, self.scope['headers'])
				user['avatar'] = avatar_url
				user['name'] = db_user.display_name if db_user.display_name is not None else db_user.username

				if (game_mode == "classic"):
					user['elo'] = user_statistic.classic_elo
					user['games'] = user_statistic.classic_wins + user_statistic.classic_losses
					user['winrate'] = get_winrate(user_statistic.classic_wins, user['games'])
				else:
					user['elo'] = user_statistic.rumble_elo
					user['games'] = user_statistic.rumble_wins + user_statistic.rumble_losses
					user['winrate'] = get_winrate(user_statistic.rumble_wins, user['games'])

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