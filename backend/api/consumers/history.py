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

class getHistory(AsyncHttpConsumer):
	async def handle(self, body):
		try:
			response_data = {
				'success': True,
				'game': [
					{
					'user1': "valgrant",
					'user2': "jnunes",
					'score1': "10",
					'score2': "8",
					'avatar1': "https://cdn.intra.42.fr/users/6256bf3b76f8634f1e0df573022b0b72/valgrant.JPG",
					'avatar2': "https://cdn.intra.42.fr/users/67da051bad2511d2fdfa7edafbd2cc10/jnunes.jpg",
					'mode': "classic",
					'elo1': "+20",
					'elo2': "-20",
				},
				{
					'user1': "valgrant",
					'user2': "ljacquem",
					'score1': "10",
					'score2': "3",
					'avatar1': "https://cdn.intra.42.fr/users/6256bf3b76f8634f1e0df573022b0b72/valgrant.JPG",
					'avatar2': "https://cdn.intra.42.fr/users/750371738bad39a3e1edb7dcf013a4de/ljacquem.jpg",
					'mode': "rumble",
					'elo1': "+17",
					'elo2': "-22",
				},
				]
			}
			return await self.send_response(200, json.dumps(response_data).encode(),
					headers=[(b"Content-Type", b"application/json")])
			user = await jwt_to_user(self.scope['headers'])
			if not user:
				response_data = {
					'success': False,
					'message': 'Invalid token or User not found'
				}
				return await self.send_response(401, json.dumps(response_data).encode(),
					headers=[(b"Content-Type", b"application/json")])

			path = self.scope['path']
			match = re.search(r'/api/get/avatar/(\w+)', path)
			host = 'https://' + next((value.decode('utf-8') for key, value in self.scope['headers'] if key == b'x-forwarded-host'), 'localhost:9000')
			if host == 'https://localhost:9000':
				host = next((value.decode('utf-8') for key, value in self.scope['headers'] if key == b'origin'), 'localhost:9000')

			response_data = {
				'username': user.username,
				'success': True,
				'avatar' : f"{host}{user.avatar.url}" if user.avatar else f"{host}/default_avatar.png",
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