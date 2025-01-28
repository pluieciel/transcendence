from PIL import Image
from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.core.cache import cache
from channels.generic.http import AsyncHttpConsumer
from channels.db import database_sync_to_async
from secrets import token_bytes
from api.db_utils import get_user_exists
from api.utils import get_secret_from_file, hash_password
import time
import base64
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
			data = await self.parse_multipart_form_data(body)
			username = data.get('username')
			password = data.get('password')
			confirm_password = data.get('confirm_password')
			avatar = data.get('avatar')
			recaptcha_token = data.get('recaptcha_token')

			if not username:
				response_data = {
					'success': False,
					'message': 'Username required'
				}
				return await self.send_response(400, json.dumps(response_data).encode(),
					headers=[(b"Content-Type", b"application/json")])

			if not password:
				response_data = {
					'success': False,
					'message': 'Password required'
				}
				return await self.send_response(400, json.dumps(response_data).encode(),
					headers=[(b"Content-Type", b"application/json")])
			
			if not confirm_password:
				response_data = {
					'success': False,
					'message': 'Confirm password required'
				}
				return await self.send_response(400, json.dumps(response_data).encode(),
					headers=[(b"Content-Type", b"application/json")])

			if not (self.is_valid_username(username)):
				response_data = {
					'success': False,
					'message': 'Username invalid: \
								must be 1-16 characters long, \
								and contain only letters or digits'
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
			
			if not (self.is_valid_password(password)):
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

			if await get_user_exists(username):
				response_data = {
					'success': False,
					'message': 'Username already exists'
				}
				return await self.send_response(400, json.dumps(response_data).encode(),
					headers=[(b"Content-Type", b"application/json")])

			if avatar:
				image_bytes = avatar.file.read()
				image = Image.open(io.BytesIO(image_bytes))
				img_byte_arr = io.BytesIO()
				image.save(img_byte_arr, format=image.format or 'PNG')
				img_byte_arr.seek(0)
				avatar.file = img_byte_arr 

			if not recaptcha_token:
				response_data = {
					'success': False,
					'message': 'Please verify that you are not a robot'
				}
				return await self.send_response(400, json.dumps(response_data).encode(),
					headers=[(b"Content-Type", b"application/json")])

			url = 'https://www.google.com/recaptcha/api/siteverify'
			params = {
				'secret': get_secret_from_file('RECAPTCHA_CLIENT_SECRET_FILE'),
				'response': recaptcha_token,
				'remoteip': ip_addr,
			}
			response = requests.post(url, data=params)

			if not response.json()['success']:
				response_data = {
					'success': False,
					'message': '01100110 01110101 01100011 01101011 00100000 01111001 01101111 01110101 00100000 01110010 01101111 01100010 01101111 01110100'
				}
				return await self.send_response(401, json.dumps(response_data).encode(),
					headers=[(b"Content-Type", b"application/json")])

			password_hash = hash_password(password)

			await self.create_user(username, password_hash, avatar)

			response_data = {
				'success': True,
				'message': 'Signup successful'
			}

			return await self.send_response(201,
				json.dumps(response_data).encode(),
				headers=[(b"Content-Type", b"application/json")])

		except Exception as e:
			response_data = {
				'success': False,
				'message': str(e)
			}
			return await self.send_response(500, json.dumps(response_data).encode(),
				headers=[(b"Content-Type", b"application/json")])

	def is_valid_username(self, username):
		regex = r'^[a-zA-Z0-9]{1,16}$'
		return bool(re.match(regex, username))

	def is_valid_password(self, password):
		regex = r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,32}$'
		return bool(re.match(regex, password))

	def generate_totp_secret(self):
		current_time = int(time.time())
		time_bytes = current_time.to_bytes(4, 'big')
		return base64.b32encode(token_bytes(16) + time_bytes).decode()

	@database_sync_to_async
	def create_user(self, username, password, avatar):
		User = get_user_model()
		user = User.objects.create_user(
			username=username,
			password=password,
			avatar=avatar,
			totp_secret=self.generate_totp_secret(),
		)
		return user

	async def parse_multipart_form_data(self, body):
		"""Parse multipart form data and return a dictionary."""
		from django.http import QueryDict
		#from djangoapi.utils.datastructures import MultiValueDict

		# Create a QueryDict to hold the parsed data
		data = QueryDict(mutable=True)

		# Split the body into parts
		boundary = body.split(b'\r\n')[0]
		parts = body.split(boundary)[1:-1]  # Ignore the first and last parts (which are empty)

		for part in parts:
			if b'Content-Disposition' in part:
				# Split the part into headers and content
				headers, content = part.split(b'\r\n\r\n', 1)
				headers = headers.decode('utf-8')
				content = content.rstrip(b'\r\n')  # Remove trailing newlines

				# Extract the name from the headers
				name = None
				filename = None
				for line in headers.splitlines():
					if 'name="' in line:
						name = line.split('name="')[1].split('"')[0]
					if 'filename="' in line:
						filename = line.split('filename="')[1].split('"')[0]

				# If it's a file, save it to the QueryDict
				if filename:
					data[name] = ContentFile(content, name=filename)
				else:
					data[name] = content.decode('utf-8')

		return data