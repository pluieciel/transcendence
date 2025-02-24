from channels.generic.http import AsyncHttpConsumer
from api.utils import get_secret_from_file
from api.db_utils import sendResponse
import json
import os

class OAuthConsumer(AsyncHttpConsumer):
	async def handle(self, body):
		try:
			client_id = get_secret_from_file('OAUTH_CLIENT_ID_FILE')
			redirect_uri = os.environ.get('OAUTH_REDIRECT_URI')
			auth_url = (
				f"https://api.intra.42.fr/oauth/authorize?"
				f"client_id={client_id}&"
				f"redirect_uri={redirect_uri}&"
				f"response_type=code&"
				f"scope=public"
			)

			response_data = {
				'success': True,
				'auth_url': auth_url,
			}
			return await self.send_response(200, json.dumps(response_data).encode(),
				headers=[(b"Content-Type", b"application/json")])
		except Exception as e:
			return await sendResponse(self, False, str(e), 500)