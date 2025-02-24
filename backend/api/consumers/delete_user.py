from channels.generic.http import AsyncHttpConsumer
from api.utils import jwt_to_user
from django.contrib.auth import get_user_model
from channels.db import database_sync_to_async
from api.db_utils import get_user_exists, sendResponse, sendBadJWT
import json

class DeleteUserConsumer(AsyncHttpConsumer):
	async def handle(self, body):
		try:
			user = await jwt_to_user(self.scope['headers'])
			if not user:
				return await sendBadJWT(self)

			data = json.loads(body.decode())
			confirm_message = data.get('confirm')

			if (confirm_message != "Delete"):
				return await sendResponse(self, False, "Invalid confirmation message", 400)

			if await self.delete_user(user.id):
				return await sendResponse(self, True, "Deleted user successfully", 400)

			return await sendResponse(self, False, "Failed to delete the user", 500)

		except Exception as e:
			return await sendResponse(self, False, str(e), 500)

	@database_sync_to_async
	def delete_user(self, user_id):
		try:
			User = get_user_model()
			User.objects.get(id=user_id).delete()
			return True
		except Exception:
			return False
