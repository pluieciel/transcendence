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

class getLeaderboard(AsyncHttpConsumer):
	async def handle(self, body):
		try:
			response_data = {
				'success': True,
				'users': [
					{
					'username': "valgrant",
					'elo': "9999",
					'winrate': "100",
					'games': "69420",
					'avatar': "https://cdn.intra.42.fr/users/6256bf3b76f8634f1e0df573022b0b72/valgrant.JPG",
				},
				{
					'username': "ljacquem",
					'elo': "210",
					'winrate': "5",
					'games': "349",
					'avatar': "https://cdn.intra.42.fr/users/750371738bad39a3e1edb7dcf013a4de/ljacquem.jpg",
				},
				]
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