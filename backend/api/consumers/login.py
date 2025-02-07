from django.contrib.auth import authenticate
from django.core.cache import cache
from channels.generic.http import AsyncHttpConsumer
from channels.db import database_sync_to_async
from api.db_utils import get_user_exists, connect_user
from api.utils import generate_jwt_cookie, hash_password
import json

class LoginConsumer(AsyncHttpConsumer):
	async def handle(self, body):
		key = self.scope['client'][0]
		rate_limit = 60
		time_window = 60 
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
			data = json.loads(body.decode())
			username = data.get('username')
			password = data.get('password')

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

			if not await get_user_exists(username):
				response_data = {
					'success': False,
					'message': 'Username doesn\'t exist'
				}
				return await self.send_response(400, json.dumps(response_data).encode(),
					headers=[(b"Content-Type", b"application/json")])

			password_hash = hash_password(password)

			user = await self.authenticate_user(username, password_hash)
			if not user:
				response_data = {
					'success': False,
					'message': 'Invalid credentials'
				}
				return await self.send_response(401, json.dumps(response_data).encode(),
					headers=[(b"Content-Type", b"application/json")])
			if not await connect_user(user=user):
				response_data = {
					'success': False,
					'message': 'User is already connected'
				}
				return await self.send_response(401, json.dumps(response_data).encode(),
					headers=[(b"Content-Type", b"application/json")])
			
			is_2fa_enabled = user.is_2fa_enabled

			if not is_2fa_enabled:
				response_data = {
					'success': True,
					'message': 'Login successful',
					'color' : user.color,
					'username': username,
				}
			else:
				response_data = {
					'success': True,
					'message': '2FA required',
					'is_2fa_enabled': True,
				}

			return await self.send_response(200, json.dumps(response_data).encode(),
				headers=[(b"Content-Type", b"application/json"), (b"Set-Cookie", generate_jwt_cookie(user))])

		except Exception as e:
			response_data = {
				'success': False,
				'message': str(e)
			}
			return await self.send_response(500, json.dumps(response_data).encode(),
				headers=[(b"Content-Type", b"application/json")])

	@database_sync_to_async
	def authenticate_user(self, username, password):
		user = authenticate(username=username, password=password)
		return user