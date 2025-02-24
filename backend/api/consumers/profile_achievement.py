from channels.generic.http import AsyncHttpConsumer
from api.utils import jwt_to_user
from api.db_utils import get_user_by_name, get_achievements_stats, get_profile_achievements, sendResponse, sendBadJWT
import json

class ProfileAchievementConsumer(AsyncHttpConsumer):
	async def handle(self, body):
		try:
			user = await jwt_to_user(self.scope['headers'])
			if not user:
				return await sendBadJWT(self)

			profile_user = await get_user_by_name(self.scope['url_route']['kwargs']['username'])
			if not profile_user:
				return await sendResponse(self, False, "User not found", 404)

			response_data = {
				'success': True,
				'achievements': await get_profile_achievements(profile_user),
				**(await get_achievements_stats(profile_user)),
			}
			return await self.send_response(200, json.dumps(response_data).encode(),
				headers=[(b"Content-Type", b"application/json")])
		except Exception as e:
			return await sendResponse(self, False, str(e), 500)
