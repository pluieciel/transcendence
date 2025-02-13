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
			color = data.get('color')
			quality = data.get('quality')
			if user.color == color and user.quality == quality:
				response_data = {
					'success': True,
					'message': 'No changes made'
				}
				return await self.send_response(200, json.dumps(response_data).encode(),
					headers=[(b"Content-Type", b"application/json")])

			await self.change_color(user, color)
			await self.change_quality(user, quality)

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
	def change_color(self, user, newcolor):
		if user.color == newcolor:
			return
		user.color = newcolor
		user.save()

	@database_sync_to_async
	def change_quality(self, user, quality):
		if user.quality == quality:
			return
		user.quality = quality
		user.save()

