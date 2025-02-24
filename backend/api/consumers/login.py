from django.contrib.auth import authenticate
from django.core.cache import cache
from channels.generic.http import AsyncHttpConsumer
from channels.db import database_sync_to_async
from api.db_utils import get_user_exists, sendResponse
from api.utils import generate_jwt_cookie, sha256_hash
import json

class LoginConsumer(AsyncHttpConsumer):
	async def handle(self, body):
		key = self.scope['client'][0]
		rate_limit = 60
		time_window = 60 
		current_usage = cache.get(key, 0)
		if current_usage >= rate_limit:
			return await sendResponse(self, False, "Too many requests. Please try again later.", 429)
		cache.set(key, current_usage + 1, timeout=time_window)

		try:
			data = json.loads(body.decode())
			username = data.get('username')
			password = data.get('password')

			if not username:
				return await sendResponse(self, False, "Username required", 400)

			if not password:
				return await sendResponse(self, False, "Password required", 400)

			if not await get_user_exists(username):
				return await sendResponse(self, False, "User not found", 404)

			user = await self.authenticate_user(username, password)
			if not user:
				return await sendResponse(self, False, "Invalid credentials", 401)
			
			is_2fa_enabled = user.is_2fa_enabled

			if not is_2fa_enabled:
				response_data = {
					'success': True,
					'message': 'Login successful',
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
			return await sendResponse(self, False, str(e), 500)

	@database_sync_to_async
	def authenticate_user(self, username, password):
		user = authenticate(username=username, password=password)
		return user