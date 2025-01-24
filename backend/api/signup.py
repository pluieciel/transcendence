from PIL import Image
from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.core.cache import cache
from channels.generic.http import AsyncHttpConsumer
from channels.db import database_sync_to_async
from .db_utils import get_user_exists
import json
import re
import io

class SignupConsumer(AsyncHttpConsumer):
	async def handle(self, body):
		# Rate limiting logic
		key = self.scope['client'][0]  # Use the client's IP address as the key
		rate_limit = 60  # Allow 5 requests
		time_window = 60  # Time window in seconds
		current_usage = cache.get(key, 0)
		if current_usage >= rate_limit:
			response_data = {
				'success': False,
				'message': 'Too many requests. Please try again later.'
			}
			return await self.send_response(429, json.dumps(response_data).encode(),
				headers=[(b"Content-Type", b"application/json")])
		cache.set(key, current_usage + 1, timeout=time_window)

		try:
			data = await self.parse_multipart_form_data(body)
			username = data.get('username')
			password = data.get('password')
			avatar = data.get('avatar')

			# Validate input
			if not (self.is_valid_username(username)):
				response_data = {
					'success': False,
					'message': 'Username invalid'
				}
				return await self.send_response(400, json.dumps(response_data).encode(),
					headers=[(b"Content-Type", b"application/json")])

			if not username or not password:
				response_data = {
					'success': False,
					'message': 'Username and password are required'
				}
				return await self.send_response(400, json.dumps(response_data).encode(),
					headers=[(b"Content-Type", b"application/json")])

			# Check if username exists
			if await get_user_exists(username):
				response_data = {
					'success': False,
					'message': 'Username already exists'
				}
				return await self.send_response(400, json.dumps(response_data).encode(),
					headers=[(b"Content-Type", b"application/json")])

			if avatar:
				# Read raw bytes from ContentFile
				image_bytes = avatar.file.read()
				# Open and resize image
				image = Image.open(io.BytesIO(image_bytes))
				resized_image = image.resize((60, 60), Image.Resampling.LANCZOS)
				# Save resized image to bytes
				img_byte_arr = io.BytesIO()
				resized_image.save(img_byte_arr, format=image.format or 'PNG')
				img_byte_arr.seek(0)
				# Update avatar with resized image
				avatar.file = img_byte_arr 
			# Create new user
			await self.create_user(username, password, avatar)

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
		regex = r'^[a-zA-Z0-9]+$'
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

	async def parse_multipart_form_data(self, body):
		"""Parse multipart form data and return a dictionary."""
		from django.http import QueryDict
		#from django.utils.datastructures import MultiValueDict

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