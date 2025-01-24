from channels.generic.http import AsyncHttpConsumer
from .utils import jwt_to_user
from .db_utils import get_user_by_name
import json
import re

class ProfileConsumer2(AsyncHttpConsumer):
	async def handle(self, body):
		try:
			user = await jwt_to_user(self.scope['headers'])
			if not user:
				response_data = {
					'success': False,
					'message': 'Invalid token or User not found'
				}
				return await self.send_response(401, json.dumps(response_data).encode(),
					headers=[(b"Content-Type", b"application/json")])

			path = self.scope['path']
			match = re.search(r'/api/get/profile/(\w+)', path)
			user_name = match.group(1)
			user = await get_user_by_name(user_name)

			tot_games = (user.wins + user.looses)
			if tot_games == 0:
				winrate = 0
			else:
				winrate = (user.wins / tot_games) * 100

			response_data = {
				'username': user.username,
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