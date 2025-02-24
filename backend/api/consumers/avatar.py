from PIL import Image
from channels.generic.http import AsyncHttpConsumer
from django.core.files.base import ContentFile
from django.utils.timezone import now
from channels.db import database_sync_to_async
from api.utils import jwt_to_user, get_user_avatar_url, parse_multipart_form_data
from api.db_utils import get_user_by_name, sendResponse, sendBadJWT
import json
import re
import io

class AvatarConsumer(AsyncHttpConsumer):
	async def handle(self, body):
		try:
			user = await jwt_to_user(self.scope['headers'])
			if not user:
				return await sendBadJWT(self)
			username = self.scope["url_route"]["kwargs"]["username"]
			avatar_user = await get_user_by_name(username)

			response_data = {
				'success': True,
				'avatar_url' : get_user_avatar_url(avatar_user, self.scope['headers']),
			}
			return await self.send_response(200, json.dumps(response_data).encode(),
				headers=[(b"Content-Type", b"application/json")])

		except Exception as e:
			return await sendResponse(self, False, str(e), 500)
