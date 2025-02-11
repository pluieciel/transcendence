from PIL import Image
from channels.generic.http import AsyncHttpConsumer
from django.core.files.base import ContentFile
from django.utils.timezone import now
from channels.db import database_sync_to_async
from api.utils import jwt_to_user, parse_multipart_form_data
from api.db_utils import get_user_by_name
import json
import re
import io

class AvatarConsumer(AsyncHttpConsumer):
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
			match = re.search(r'/api/get/avatar/(\w+)', self.scope['path'])
			username = match.group(1)
			avatar_user = await get_user_by_name(username)

			response_data = {
				'success': True,
				'avatar_url' : self.get_user_avatar_url(avatar_user, self.scope['headers']),
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

	def get_user_avatar_url(self, user, headers):
		if (user.is42avatarused):
			return user.avatar42
		host = next(value.decode('utf-8') for key, value in headers if key == b'x-forwarded-host')
		port = next(value.decode('utf-8') for key, value in headers if key == b'x-forwarded-port')
		url = f"https://{host}:{port}"
		return f"{url}{user.avatar.url}" if user.avatar else f"{url}/imgs/default_avatar.png"

class setAvatar(AsyncHttpConsumer):
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

			data = await parse_multipart_form_data(body=body)
			avatar = data.get('newAvatar')

			if avatar:
				image_bytes = avatar.file.read()
				image = Image.open(io.BytesIO(image_bytes))
				img_byte_arr = io.BytesIO()
				image.save(img_byte_arr, format=image.format or 'PNG')
				img_byte_arr.seek(0)
				avatar.file = img_byte_arr 
			
			user = await get_user_by_name(user.username)

			if not await self.change_avatar(user, avatar):
				response_data = {
					'success': False,
					'message': 'Failed to set avatar'
				}
				return await self.send_response(500, json.dumps(response_data).encode(),
					headers=[(b"Content-Type", b"application/json")])
			
			print("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", flush=True)
			print(user, flush=True)
			print(user.is42avatarused, flush=True)

			response_data = {
				'success': True,
				'message': 'Avatar set successfully'
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
	def change_avatar(self, user, avatar):
		try:
			if user.avatar:
				user.avatar.delete(save=False)
			if user.oauthlog:
				user.is42avatarused = False
			user.avatar = avatar
			user.save()
			return True
		except Exception as e:
			return False


