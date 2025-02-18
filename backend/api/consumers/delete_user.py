from channels.generic.http import AsyncHttpConsumer
from api.utils import jwt_to_user
from django.contrib.auth import get_user_model
from channels.db import database_sync_to_async
from api.db_utils import get_user_exists
import json

class DeleteUserConsumer(AsyncHttpConsumer):
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

			data = json.loads(body.decode())
			confirm_message = data.get('confirm')

			if (confirm_message != "Delete"):
				response_data = {
					'success': False,
					'message': "Invalid confirmation message"
				}
				return await self.send_response(400, json.dumps(response_data).encode(),
					headers=[(b"Content-Type", b"application/json")])

			if await self.delete_user(user.id):
				response_data = {
					'success': True,
					'message': "Deleted user successfully"
				}
				return await self.send_response(200, json.dumps(response_data).encode(),
					headers=[(b"Content-Type", b"application/json")])
			response_data = {
				'success': False,
				'message': "Failed to delete the user"
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
	def delete_user(self, user_id):
		try:
			User = get_user_model()
			User.objects.get(id=user_id).delete()
			return True
		except Exception:
			return False
