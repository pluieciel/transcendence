from PIL import Image
from django.contrib.auth import get_user_model, authenticate
from channels.generic.http import AsyncHttpConsumer
from channels.db import database_sync_to_async
from api.utils import jwt_to_user, is_valid_password, sha256_hash, parse_multipart_form_data
from api.db_utils import sendResponse, sendBadJWT
import json
import re
import io

class GetSettingsConsumer(AsyncHttpConsumer):
	async def handle(self, body):
		try:
			user = await jwt_to_user(self.scope['headers'])
			if not user:
				return await sendBadJWT(self)
			response_data = {
				'success': True,
				'display_name': user.display_name,
				'is_42_user': user.is_42_user,
				'is_2fa_enabled': user.is_2fa_enabled,
			}
			return await self.send_response(200, json.dumps(response_data).encode(),
				headers=[(b"Content-Type", b"application/json")])
		except Exception as e:
			return await sendResponse(self, False, str(e), 500)

class SetSettingsConsumer(AsyncHttpConsumer):
	async def handle(self, body):
		try:
			user = await jwt_to_user(self.scope['headers'])
			if not user:
				return await sendBadJWT(self)

			data = await parse_multipart_form_data(body=body)
			display_name = data.get('display_name')
			password = data.get('password')
			confirm_password = data.get('confirm_password')
			avatar = data.get('avatar')
			settings_updated = False

			if display_name != user.display_name and not (display_name == "" and user.display_name is None):
				if display_name == "":
					display_name = None
				elif not (self.is_valid_display_name(display_name)):
					return await sendResponse(self, False, "Display name invalid: must be 1-16 characters long, and contain only letters or digits", 400)

				await self.update_display_name(user, display_name)
				settings_updated = True

			if avatar:
				if user.is_42_user:
					return await sendResponse(self, False, "Avatar cannot be modified for oauth", 403)
				image_bytes = avatar.file.read()
				image = Image.open(io.BytesIO(image_bytes))
				img_byte_arr = io.BytesIO()
				image.save(img_byte_arr, format=image.format or 'PNG')
				img_byte_arr.seek(0)
				avatar.file = img_byte_arr
				await self.update_avatar(user, avatar)
				settings_updated = True

			if (password or confirm_password) and user.is_42_user:
				return await sendResponse(self, False, "Password cannot be modified for oauth", 403)

			if not password and not confirm_password:
				return await sendResponse(self, True, "Updated successfully" if settings_updated else "No changes made", 201)

			if not password and confirm_password:
				return await sendResponse(self, False, "Password required", 400)
			
			if not confirm_password and password:
				return await sendResponse(self, False, "Confirm password required", 400)

			if password != confirm_password:
				return await sendResponse(self, False, "Passwords do not match", 400)
		
			if not is_valid_password(password):
				return await sendResponse(self, False, "Password invalid: must be 8-32 characters long, contain at least one lowercase letter, one uppercase letter,\n one digit, and one special character from @$!%*?&", 400)

			await self.update_password(user, password)

			await sendResponse(self, True, "Updated successfully", 201)

		except Exception as e:
			await sendResponse(self, False, str(e), 500)

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
		user.avatar = avatar
		user.save()
