from channels.generic.http import AsyncHttpConsumer
from api.utils import jwt_to_user
from django.contrib.auth import get_user_model
from channels.db import database_sync_to_async
from api.db_utils import get_user_exists
import json

class RemoveConsumer(AsyncHttpConsumer):
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

			if not await get_user_exists(user.username):
				response_data = {
					'success': False,
					'message': 'Username doesnt exists'
				}
				return await self.send_response(400, json.dumps(response_data).encode(),
					headers=[(b"Content-Type", b"application/json")])

			if await self.remove_user(user.username, user.id):
				response_data = {
					'success': True,
					'message': "Deleted user successfully"
				}
				return await self.send_response(200, json.dumps(response_data).encode(),
					headers=[(b"Content-Type", b"application/json")])
			response_data = {
				'success': False,
				'message': "Failed to remove the user from the database"
			}
			return await self.send_response(500, json.dumps(response_data).encode(),
				headers=[(b"Content-Type", b"application/json")])


		except Exception as e:
			response_data = {
				'success': False,
				'message': str(e)
			}
			return await self.send_response(500, json.dumps(response_data).encode(),
				headers=[(b"Content-Type", b"application/json")])

	@database_sync_to_async
	def remove_user(self, username, uid):
		try:
			User = get_user_model()
			u = User.objects.get(username = username, id = uid)
			u.delete()
			return True
		except Exception as e:
			return False
