from channels.generic.http import AsyncHttpConsumer
from .utils import jwt_to_user
from .db_utils import get_user_by_name
import json
import re

class AvatarConsumer(AsyncHttpConsumer):
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
			match = re.search(r'/api/get/avatar/(\w+)', path)
			user_name = match.group(1)
			user = await get_user_by_name(user_name)
			host = 'https://' + next((value.decode('utf-8') for key, value in self.scope['headers'] if key == b'x-forwarded-host'), 'localhost:9000')
			if host == 'https://localhost:9000':
				host = next((value.decode('utf-8') for key, value in self.scope['headers'] if key == b'origin'), 'localhost:9000')
			#print(self.scope, flush=True)
			response_data = {
				'username': user.username,
				'success': True,
				'avatar' : f"{host}{user.avatar.url}" if user.avatar else f"{host}/default_avatar.png",
			}
			if (user.oauthlog):
				print('avatar link ', flush=True)
				print(user.avatar42, flush=True)
				response_data['avatar'] = user.avatar42
			return await self.send_response(200, json.dumps(response_data).encode(),
				headers=[(b"Content-Type", b"application/json")])

		except Exception as e:
			response_data = {
				'success': False,
				'message': str(e)
			}
			return await self.send_response(500, json.dumps(response_data).encode(),
				headers=[(b"Content-Type", b"application/json")])
