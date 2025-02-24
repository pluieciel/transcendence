from django.contrib.auth import get_user_model
from channels.generic.http import AsyncHttpConsumer
from channels.db import database_sync_to_async
from api.utils import generate_jwt_cookie, get_secret_from_file
from api.db_utils import get_user_by_name, sendResponse
import json
import os
import requests

class LoginOAuthConsumer(AsyncHttpConsumer):
	async def handle(self, body):
		try:
			data = json.loads(body.decode())
			code = data.get('code')

			if not code:
				return await sendResponse(self, False, "Code required", 400)

			client_id = get_secret_from_file('OAUTH_CLIENT_ID_FILE')
			client_secret = get_secret_from_file('OAUTH_CLIENT_SECRET_FILE')

			url = 'https://api.intra.42.fr/oauth/token'
			params = {
				'grant_type': 'authorization_code',
				'client_id': client_id,
				'client_secret': client_secret,
				'code': code,
				'redirect_uri': os.environ.get('OAUTH_REDIRECT_URI')
			}

			response = requests.post(url, data=params)

			if response.status_code != 200:
				return await sendResponse(self, False, f"Failed to exchange code for token. Status code: {response.status_code}", 500)

			access_token = response.json()['access_token']
			headers = {
				'Authorization': f'Bearer {access_token}'
			}

			user_response = requests.get('https://api.intra.42.fr/v2/me', headers=headers)

			if user_response.status_code == 200:
				user_data = user_response.json()
				username = user_data['login']

				user = await get_user_by_name(username)
				if not user:
					user = await self.create_user_oauth(username=username, avatarUrl=user_data['image']['link'])
				response_data = {
					'success': True,
					'message': 'Login successful',
					'username': username,
				}
				return await self.send_response(200, json.dumps(response_data).encode(),
					headers=[(b"Content-Type", b"application/json"), (b"Set-Cookie", generate_jwt_cookie(user))])
			else:
				return await sendResponse(self, False, f"Failed to fetch user: {user_response.json()}", 500)

		except Exception as e:
			return await sendResponse(self, False, str(e), 500)

	@database_sync_to_async
	def create_user_oauth(self, username, avatarUrl):
		User = get_user_model()
		return User.objects.create_user_oauth(username=username, avatarUrl=avatarUrl)