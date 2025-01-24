from channels.generic.http import AsyncHttpConsumer
from api.utils import generate_jwt_cookie, verify_totp
from api.db_utils import get_user_by_name
import json

class Login2FAConsumer(AsyncHttpConsumer):
	async def handle(self, body):
		try:
			data = json.loads(body.decode())
			totp_input = data.get('totp')
			username = data.get('username')

			user = await get_user_by_name(username)

			is_totp_valid = verify_totp(user.totp_secret, totp_input)

			if not is_totp_valid:
				response_data = {
					'success': False,
					'message': 'Invalid totp code'
				}
				return await self.send_response(401, json.dumps(response_data).encode(),
					headers=[(b"Content-Type", b"application/json")])

			response_data = {
				'success': True,
				'message': 'Login successful',
				'username': username,
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