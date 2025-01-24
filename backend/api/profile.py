from channels.generic.http import AsyncHttpConsumer
from .utils import jwt_to_user
import json

class ProfileConsumer(AsyncHttpConsumer):
	async def handle(self, body):
		try:
			user = await jwt_to_user(self.scope['headers'])
			if not user:
				response_data = {
					'success': False,
					'message': 'User not found'
				}
				return await self.send_response(401, json.dumps(response_data).encode(),
					headers=[(b"Content-Type", b"application/json")])

			tot_games = (user.wins + user.looses)
			if tot_games == 0:
				winrate = "No games found"
			else:
				winrate = (user.wins / tot_games) * 100 + "%"

			response_data = {
				'success': True,
				'elo': user.elo,
				'winrate': winrate,
				'tourn': user.tourn_win,
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
