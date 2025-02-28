from PIL import Image
from django.contrib.auth import get_user_model
from django.core.cache import cache
from channels.generic.http import AsyncHttpConsumer
from channels.db import database_sync_to_async
from api.db_utils import get_user_exists, sendResponse
from api.utils import get_secret_from_file, is_valid_password, sha256_hash, parse_multipart_form_data
import json
import re
import io
import requests

class SignupConsumer(AsyncHttpConsumer):
	async def handle(self, body):
		ip_addr = self.scope['client'][0]
		rate_limit = 60
		time_window = 60
		current_usage = cache.get(ip_addr, 0)
		if current_usage >= rate_limit:
			response_data = {
				'success': False,
				'message': 'Too many requests. Please try again later.'
			}
			return await self.send_response(429, json.dumps(response_data).encode(),
				headers=[(b"Content-Type", b"application/json")])
		cache.set(ip_addr, current_usage + 1, timeout=time_window)

		try:
			data = await parse_multipart_form_data(body=body)
			username = data.get('username')
			password = data.get('password')
			confirm_password = data.get('confirm_password')
			avatar = data.get('avatar')
			recaptcha_token = data.get('recaptcha_token')

			if not username:
				return await sendResponse(self, False, "Username required", 400)

			if "admin" in username.lower():
				return await sendResponse(self, False, "Admin as username is forbidden", 400)

			if not password:
				return await sendResponse(self, False, "Password required", 400)
			
			if not confirm_password:
				return await sendResponse(self, False, "Confirm password required", 400)

			if not (self.is_valid_username(username)):
				return await sendResponse(self, False, "Username invalid: must be 1-16 characters long, and contain only letters or digits", 400)

			if password != confirm_password:
				return await sendResponse(self, False, "Passwords do not match", 400)

			if await get_user_exists(username):
				return await sendResponse(self, False, "Username already exists", 400)

			if not recaptcha_token:
				return await sendResponse(self, False, "Please verify that you are not a robot", 400)

			if avatar:
				image_bytes = avatar.file.read()
				image = Image.open(io.BytesIO(image_bytes))
				img_byte_arr = io.BytesIO()
				image.save(img_byte_arr, format=image.format or 'PNG')
				img_byte_arr.seek(0)
				avatar.file = img_byte_arr 

			url = 'https://www.google.com/recaptcha/api/siteverify'
			params = {
				'secret': get_secret_from_file('RECAPTCHA_CLIENT_SECRET_FILE'),
				'response': recaptcha_token,
				'remoteip': ip_addr,
			}
			response = requests.post(url, data=params)

			if not response.json()['success']:
				return await sendResponse(self, False, "01100110 01110101 01100011 01101011 00100000 01111001 01101111 01110101 00100000 01110010 01101111 01100010 01101111 01110100", 400)

			await self.create_user(username, password, avatar)

			return await sendResponse(self, True, "Signup successful", 201)

		except Exception as e:
			return await sendResponse(self, False, str(e), 500)

	def is_valid_username(self, username):
		regex = r'^[a-zA-Z0-9]{1,16}$'
		return bool(re.match(regex, username))

	@database_sync_to_async
	def create_user(self, username, password, avatar):
		User = get_user_model()
		user = User.objects.create_user(
			username=username,
			password=password,
			avatar=avatar
		)
		return user