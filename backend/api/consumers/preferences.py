from channels.generic.http import AsyncHttpConsumer
from api.utils import jwt_to_user
from channels.db import database_sync_to_async
import json

class getPreferences(AsyncHttpConsumer):
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
			response_data = {
				'success': True,
				'color': user.color,
				'quality': user.quality,
				'is_2fa_enabled': user.is_2fa_enabled,
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
		

class setPreferences(AsyncHttpConsumer):
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
			if not await self.change_color(user, data.get('newColor')) or not await self.change_quality(user, data.get('newQuality')):
				response_data = {
					'success': False,
					'message': 'Failed to set color'
				}
				return await self.send_response(500, json.dumps(response_data).encode(),
					headers=[(b"Content-Type", b"application/json")])

			response_data = {
				'success': True,
				'color': user.color,
				'message': 'Color set successfully'
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
	def change_color(self, user, newcolor):
		try:
			user.color = newcolor
			user.save()
			return True
		except Exception as e:
			return False

	@database_sync_to_async
	def change_quality(self, user, quality):
		try:
			user.quality = quality
			user.save()
			return True
		except Exception as e:
			return False
