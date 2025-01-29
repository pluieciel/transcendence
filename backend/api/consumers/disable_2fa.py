from channels.generic.http import AsyncHttpConsumer
from channels.db import database_sync_to_async
from api.utils import jwt_to_user
from api.db_utils import user_update_is_2fa_enabled
import json

class Disable2FAConsumer(AsyncHttpConsumer):
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

			if not user.is_2fa_enabled:
				response_data = {
					'success': False,
					'message': '2FA not enabled'
				}
				return await self.send_response(409, json.dumps(response_data).encode(),
					headers=[(b"Content-Type", b"application/json")])
			
			await user_update_is_2fa_enabled(user, False)

			response_data = {
				'success': True,
				'message': '2FA disabled',
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