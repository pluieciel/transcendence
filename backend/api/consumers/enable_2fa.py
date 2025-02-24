from channels.generic.http import AsyncHttpConsumer
from channels.db import database_sync_to_async
from api.utils import jwt_to_user, verify_totp
from api.db_utils import update_is_2fa_enabled, sendResponse, sendBadJWT
import json

class Enable2FAConsumer(AsyncHttpConsumer):
	async def handle(self, body):
		try:
			user = await jwt_to_user(self.scope['headers'])
			if not user:
				return await sendBadJWT(self)

			if user.is_42_user:
				return await sendResponse(self, False, "2FA is not available for oauth", 403)

			if user.is_2fa_enabled:
				return await sendResponse(self, False, "2FA already enabled", 409)

			data = json.loads(body.decode())
			totp_input = data.get('totp')

			is_totp_valid = verify_totp(user.totp_secret, totp_input)

			if not is_totp_valid:
				return await sendResponse(self, False, "Invalid 2FA code", 401)

			await update_is_2fa_enabled(user, True)

			return await sendResponse(self, True, "2FA enabled", 200)
		except Exception as e:
			return await sendResponse(self, False, str(e), 500)
