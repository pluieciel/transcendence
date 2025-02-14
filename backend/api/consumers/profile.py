from channels.generic.http import AsyncHttpConsumer
from api.utils import jwt_to_user
from api.db_utils import get_user_statistic
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

			tot_games = (user.wins + user.looses)
			if tot_games == 0:
				winrate = "No games found"
			else:
				winrate = (user.wins / tot_games) * 100
				winrate = f"{winrate:.0f}%"

			user_statistic = await get_user_statistic(user)

			response_data = {
				'success': True,
				'classic_elo': user_statistic.classic_elo,
				'wins': user.wins,
				'looses': user.looses,
				'winrate': winrate,
				'tourn_won': user.tournament_wins,
				'tournament_participated': user.tournament_wins, #need to fix this
				'display_name': user.display_name,
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
