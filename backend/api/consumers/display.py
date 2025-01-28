from channels.generic.http import AsyncHttpConsumer
from api.utils import jwt_to_user
from channels.db import database_sync_to_async
import json

class setDisplay(AsyncHttpConsumer):
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

			data = json.loads(body.decode())
			if not await self.change_name(user, data.get('displayName')):
				response_data = {
					'success': False,
					'message': 'Failed to set display name'
				}
				return await self.send_response(500, json.dumps(response_data).encode(),
					headers=[(b"Content-Type", b"application/json")])

			response_data = {
				'success': True,
				'displayName': user.display,
				'message': 'Display name set successfully'
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
	def change_name(self, user, newDisplay):
		try:
			user.display = newDisplay
			user.save()
			return True
		except Exception as e:
			return False
