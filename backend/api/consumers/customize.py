from channels.generic.http import AsyncHttpConsumer
from channels.db import database_sync_to_async
from api.utils import jwt_to_user
from api.db_utils import get_user_preference, is_color_unlocked
import json
import logging

class GetCustomizeConsumer(AsyncHttpConsumer):
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

			user_preference = await get_user_preference(user)

			response_data = {
				'success': True,
				'color': user_preference.color,
				'quality': user_preference.quality,
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

class SetCustomizeConsumer(AsyncHttpConsumer):
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
			color = data.get('color')
			quality = data.get('quality')
			if (await is_color_unlocked(user, color) == False):
				response_data = {
					'success': False,
					'message': 'Color is not unlocked'
				}
				return await self.send_response(403, json.dumps(response_data).encode(),
					headers=[(b"Content-Type", b"application/json")])
			
			user_preference = await get_user_preference(user)

			if user_preference.color == color and user_preference.quality == quality:
				response_data = {
					'success': True,
					'message': 'No changes made'
				}
				return await self.send_response(200, json.dumps(response_data).encode(),
					headers=[(b"Content-Type", b"application/json")])

			await self.update_user_preferences_color(user, color)
			await self.update_user_preferences_quality(user, quality)

			response_data = {
				'success': True,
				'message': 'Updated successfully'
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

