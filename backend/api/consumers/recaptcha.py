from channels.generic.http import AsyncHttpConsumer
from api.utils import get_secret_from_file
from api.db_utils import sendResponse
import json

class RecaptchaConsumer(AsyncHttpConsumer):
	async def handle(self, body):
		try:
			client_id = get_secret_from_file('RECAPTCHA_CLIENT_ID_FILE')

			response_data = {
				'success': True,
				'client_id': client_id,
			}
			return await self.send_response(200, json.dumps(response_data).encode(),
				headers=[(b"Content-Type", b"application/json")])
		except Exception as e:
			return await sendResponse(self, False, "User not found", 404)