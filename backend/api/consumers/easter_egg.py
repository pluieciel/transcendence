from channels.generic.http import AsyncHttpConsumer
from api.utils import jwt_to_user
from api.db_utils import get_achievements, unlock_achievement, sendResponse, sendBadJWT
import json

class EasterEggConsumer(AsyncHttpConsumer):
	async def handle(self, body):
		try:
			user = await jwt_to_user(self.scope['headers'])
			if not user:
				return await sendBadJWT(self)
			achievement_unlocked = await unlock_achievement(user, 'Easter Egg')
			response_data = {
				'success': achievement_unlocked,
			}
			return await self.send_response(200, json.dumps(response_data).encode(),
				headers=[(b"Content-Type", b"application/json")])
		except Exception as e:
			return await sendResponse(self, False, str(e), 500)
