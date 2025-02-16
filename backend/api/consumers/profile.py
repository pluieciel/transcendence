from channels.generic.http import AsyncHttpConsumer
from api.utils import jwt_to_user, get_user_avatar_url, get_users_with_stats, get_winrate, sort_leaderboard
from api.db_utils import get_user_by_name, get_user_statistic
import json

class ProfileConsumer(AsyncHttpConsumer):
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

			user_statistic = await get_user_statistic(profile_user)

			classic_total_played = user_statistic.classic_wins + user_statistic.classic_losses
			rumble_total_played = user_statistic.rumble_wins + user_statistic.rumble_losses
			tournament_total_participated = user_statistic.tournament_top_1 + user_statistic.tournament_losses

			response_data = {
				'success': True,
				'username': profile_user.username,
				'is_42_user': profile_user.is_42_user,
				'avatar_url': get_user_avatar_url(profile_user, self.scope['headers']),
				'display_name': profile_user.display_name,
				'classic': {
					'total_played': classic_total_played,
					'wins': user_statistic.classic_wins,
					'winrate': get_winrate(user_statistic.classic_wins, classic_total_played),
					'elo': user_statistic.classic_elo,
					'rank': await self.get_user_rank(profile_user, "classic"),
				},
				'rumble': {
					'total_played': rumble_total_played,
					'wins': user_statistic.rumble_wins,
					'winrate': get_winrate(user_statistic.rumble_wins, rumble_total_played),
					'elo': user_statistic.rumble_elo,
					'rank': await self.get_user_rank(profile_user, "rumble"),
				},
				'tournament': {
					'total_participated': tournament_total_participated,
					'top_1': user_statistic.tournament_top_1,
					'top_2': user_statistic.tournament_top_2,
					'winrate': "No games", # TODO: get tournament winrate
					'max_streak': user_statistic.tournament_max_streak,
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

	async def get_user_rank(self, user, game_mode):
		users = await get_users_with_stats(game_mode, self.scope['headers'])
		sorted_users = sort_leaderboard(users)
		for i, u in enumerate(sorted_users):
			if u['username'] == user.username:
				return i + 1
		return None

