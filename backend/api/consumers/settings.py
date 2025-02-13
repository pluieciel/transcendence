from PIL import Image
from django.contrib.auth import get_user_model, authenticate
from channels.generic.http import AsyncHttpConsumer
from channels.db import database_sync_to_async
from api.utils import jwt_to_user, is_valid_password, sha256_hash, parse_multipart_form_data
import json
import re
import io

class GetSettingsConsumer(AsyncHttpConsumer):
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
				'display_name': user.display_name,
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

class SetSettingsConsumer(AsyncHttpConsumer):
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
			display_name = data.get('display_name')
			password = data.get('password')
			confirm_password = data.get('confirm_password')
			avatar = data.get('avatar')
			settings_updated = False

			if display_name != user.display_name:
				if display_name == "":
					pass
				elif not (self.is_valid_display_name(display_name)):
					response_data = {
						'success': False,
						'message': 'Display name invalid: \
									must be 1-16 characters long, \
									and contain only letters or digits'
					}
					return await self.send_response(400, json.dumps(response_data).encode(),
						headers=[(b"Content-Type", b"application/json")])

				await self.update_display_name(user, display_name)
				settings_updated = True

			if avatar:
				image_bytes = avatar.file.read()
				image = Image.open(io.BytesIO(image_bytes))
				img_byte_arr = io.BytesIO()
				image.save(img_byte_arr, format=image.format or 'PNG')
				img_byte_arr.seek(0)
				avatar.file = img_byte_arr
				await self.update_avatar(user, avatar)
				settings_updated = True

			if not password and not confirm_password:
				response_data = {
					'success': True,
					'message': 'Updated successfully' if settings_updated else 'No changes made'
				}
				return await self.send_response(201, json.dumps(response_data).encode(),
					headers=[(b"Content-Type", b"application/json")])

			if not password and confirm_password:
				response_data = {
					'success': False,
					'message': 'Password required'
				}
				return await self.send_response(400, json.dumps(response_data).encode(),
					headers=[(b"Content-Type", b"application/json")])
			
			if not confirm_password and password:
				response_data = {
					'success': False,
					'message': 'Confirm password required'
				}
				return await self.send_response(400, json.dumps(response_data).encode(),
					headers=[(b"Content-Type", b"application/json")])

			if password != confirm_password:
				response_data = {
					'success': False,
					'message': 'Passwords do not match'
				}
				return await self.send_response(400, json.dumps(response_data).encode(),
					headers=[(b"Content-Type", b"application/json")])
		
			if not is_valid_password(password):
				response_data = {
					'success': False,
					'message': 'Password invalid: \
								must be 8-32 characters long, \
								contain at least one lowercase letter, \
								one uppercase letter,\n one digit, \
								and one special character from @$!%*?&'
				}
				return await self.send_response(400, json.dumps(response_data).encode(),
					headers=[(b"Content-Type", b"application/json")])

			await self.update_password(user, password)

			response_data = {
				'success': True,
				'message': 'Updated successfully'
			}
			return await self.send_response(201, json.dumps(response_data).encode(),
				headers=[(b"Content-Type", b"application/json")])
		except Exception as e:
			response_data = {
				'success': False,
				'message': str(e)
			}
			return await self.send_response(500, json.dumps(response_data).encode(),
				headers=[(b"Content-Type", b"application/json")])

	def is_valid_display_name(self, display_name):
		regex = r'^[a-zA-Z0-9]{1,16}$'
		return bool(re.match(regex, display_name))

	@database_sync_to_async
	def update_display_name(self, user, display_name):
		user.display_name = display_name
		user.save()

	@database_sync_to_async
	def update_password(self, user, new_password):
		user.set_password(new_password)
		user.save()

	@database_sync_to_async
	def update_avatar(self, user, avatar):
		if user.avatar:
			user.avatar.delete(save=False)
		if user.is_oauth_user:
			user.is_42_avatar_used = False
		user.avatar = avatar
		user.save()
