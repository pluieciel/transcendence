from channels.generic.http import AsyncHttpConsumer
from api.utils import generate_jwt_cookie, verify_totp
from api.db_utils import get_user_by_name, sendResponse
import json

class Login2FAConsumer(AsyncHttpConsumer):
	async def handle(self, body):
		try:
			data = json.loads(body.decode())
			totp_input = data.get('totp')
			username = data.get('username')

			user = await get_user_by_name(username)

			if not user.is_2fa_enabled:
				return await sendResponse(self, False, "2FA not enabled", 401)

			is_totp_valid = verify_totp(user.totp_secret, totp_input)

			if not is_totp_valid:
				return await sendResponse(self, False, "Invalid totp code", 401)

			response_data = {
				'success': True,
				'message': 'Login successful',
				'username': username,
			}
			return await self.send_response(200, json.dumps(response_data).encode(),
				headers=[(b"Content-Type", b"application/json"), (b"Set-Cookie", generate_jwt_cookie(user))])
		except Exception as e:
			return await sendResponse(self, False, str(e), 500)