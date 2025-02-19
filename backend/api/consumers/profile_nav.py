from channels.generic.http import AsyncHttpConsumer
from api.utils import jwt_to_user, get_user_avatar_url
import json

class ProfileNavConsumer(AsyncHttpConsumer):
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
			response_data = {
				'success': True,
				'username': user.username,
				'display_name': user.display_name,
				'is_42_avatar_used': user.is_42_avatar_used,
				'avatar_url': get_user_avatar_url(user, self.scope['headers']),
				'is_admin': user.is_admin,
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