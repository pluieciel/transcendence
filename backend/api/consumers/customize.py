from channels.generic.http import AsyncHttpConsumer
from channels.db import database_sync_to_async
from api.utils import jwt_to_user
from api.db_utils import get_user_preference, is_color_unlocked, sendResponse, sendBadJWT
import json
import logging

class GetCustomizeConsumer(AsyncHttpConsumer):
	async def handle(self, body):
		try:
			user = await jwt_to_user(self.scope['headers'])
			if not user:
				return await sendBadJWT(self)

			user_preference = await get_user_preference(user)

			response_data = {
				'success': True,
				'color': user_preference.color,
				'quality': user_preference.quality,
			}
			return await self.send_response(200, json.dumps(response_data).encode(),
				headers=[(b"Content-Type", b"application/json")])
		except Exception as e:
			return await sendResponse(self, False, str(e), 500)

class SetCustomizeConsumer(AsyncHttpConsumer):
	async def handle(self, body):
		try:
			user = await jwt_to_user(self.scope['headers'])
			if not user:
				return await sendBadJWT(self)

			data = json.loads(body.decode())
			color = data.get('color')
			quality = data.get('quality')
			if (await is_color_unlocked(user, color) == False):
				return await sendResponse(self, False, "Color is not unlocked", 403)
		
			user_preference = await get_user_preference(user)

			if user_preference.color == color and user_preference.quality == quality:
				return await sendResponse(self, True, "No changes made", 200)

			await self.update_user_preferences_color(user, color)
			await self.update_user_preferences_quality(user, quality)

			return await sendResponse(self, True, "Updated successfully", 200)

		except Exception as e:
			return await sendResponse(self, False, str(e), 500)

	@database_sync_to_async
	def update_user_preferences_color(self, user, color):
		from api.models import UserPreference
		user_preference = UserPreference.objects.get(user=user)
		if user_preference.color == color:
			return
		user_preference.color = color
		user_preference.save()

	@database_sync_to_async
	def update_user_preferences_quality(self, user, quality):
		from api.models import UserPreference
		user_preference = UserPreference.objects.get(user=user)
		if user_preference.quality == quality:
			return
		user_preference.quality = quality
		user_preference.save()

