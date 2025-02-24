from channels.generic.http import AsyncHttpConsumer
from api.utils import jwt_to_user, get_user_avatar_url
from api.db_utils import sendResponse, sendBadJWT
import json

class ProfileNavConsumer(AsyncHttpConsumer):
	async def handle(self, body):
		try:
			user = await jwt_to_user(self.scope['headers'])
			if not user:
				return await sendBadJWT(self)
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
			return await sendResponse(self, False, str(e), 500)
