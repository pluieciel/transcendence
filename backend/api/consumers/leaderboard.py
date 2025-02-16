from channels.generic.http import AsyncHttpConsumer
from django.contrib.auth import get_user_model
from channels.db import database_sync_to_async
from api.utils import get_user_avatar_url
from api.db_utils import get_user_by_name, get_user_statistic
import json

class LeaderboardConsumer(AsyncHttpConsumer):
	async def handle(self, body):
		try:
			users = await self.get_users()
			for user in users:
				db_user = await get_user_by_name(user['username'])
				user_statistic = await get_user_statistic(db_user)

				user['classic_elo'] = user_statistic.classic_elo
				user['rumble_elo'] = user_statistic.rumble_elo
				user['classic_games'] = user_statistic.classic_wins + user_statistic.classic_losses
				user['rumble_games'] = user_statistic.rumble_wins + user_statistic.rumble_losses
				user['classic_winrate'] = self.get_winrate(user_statistic.classic_wins, user['classic_games'])
				user['rumble_winrate'] = self.get_winrate(user_statistic.rumble_wins, user['rumble_games'])
				user['avatar'] = get_user_avatar_url(db_user, self.scope['headers'])

			classic_leaderboard = sorted(users, 
				key=lambda x: (-x['classic_elo'], x['classic_winrate'] == 'No games', -float(x['classic_winrate'].rstrip('%')) if x['classic_winrate'] != 'No games' else 0, x['username'].lower()))
			rumble_leaderboard = sorted(users, 
				key=lambda x: (-x['rumble_elo'], x['rumble_winrate'] == 'No games', -float(x['rumble_winrate'].rstrip('%')) if x['rumble_winrate'] != 'No games' else 0, x['username'].lower()))

			response_data = {
				'success': True,
				'classic_leaderboard': classic_leaderboard,
				'rumble_leaderboard': rumble_leaderboard,
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
	def get_users(self):
		User = get_user_model()
		return list(User.objects.values('username'))

	def get_winrate(self, wins, games):
		if games != 0:
			return f"{(wins / games) * 100:.2f}%"
		else:
			return 'No games'