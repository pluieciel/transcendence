from channels.generic.http import AsyncHttpConsumer
from channels.db import database_sync_to_async
from api.utils import jwt_to_user, verify_totp
from api.db_utils import update_is_2fa_enabled
import json

class Enable2FAConsumer(AsyncHttpConsumer):
	async def handle(self, body):
		try:
			user = await jwt_to_user(self.scope['headers'])
			if not user:
				response_data = {
					'success': False,
					'message': 'Invalid token or User not found'
				}
				return await self.send_response(401, json.dumps(response_data).encode(),
					headers=[(b"Content-Type", b"application/json")])

			if user.is_2fa_enabled:
				response_data = {
					'success': False,
					'message': '2FA already enabled'
				}
				return await self.send_response(409, json.dumps(response_data).encode(),
					headers=[(b"Content-Type", b"application/json")])

			data = json.loads(body.decode())
			totp_input = data.get('totp')

			is_totp_valid = verify_totp(user.totp_secret, totp_input)

			if not is_totp_valid:
				response_data = {
					'success': False,
					'message': 'Invalid totp code'
				}
				return await self.send_response(401, json.dumps(response_data).encode(),
					headers=[(b"Content-Type", b"application/json")])

			await update_is_2fa_enabled(user, True)

			response_data = {
				'success': True,
				'message': '2FA enabled',
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