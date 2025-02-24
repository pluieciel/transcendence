from channels.generic.http import AsyncHttpConsumer
from api.utils import jwt_to_user
from api.db_utils import get_achievements, unlock_achievement, sendResponse
import json

class EasterEggConsumer(AsyncHttpConsumer):
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
			achievement_unlocked = await unlock_achievement(user, 'Easter Egg')
			response_data = {
				'success': achievement_unlocked,
			}
			return await self.send_response(200, json.dumps(response_data).encode(),
				headers=[(b"Content-Type", b"application/json")])
		except Exception as e:
			return await sendResponse(self, False, str(e), 500)
