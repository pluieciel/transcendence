from channels.generic.http import AsyncHttpConsumer
from channels.db import database_sync_to_async
from api.utils import generate_jwt_cookie, sha256_hash
from api.db_utils import get_user_by_name, sendResponse, sendBadJWT
import json

class Login2FARecoveryConsumer(AsyncHttpConsumer):
	async def handle(self, body):
		try:
			data = json.loads(body.decode())
			recovery_code = data.get('recovery_code')
			username = data.get('username')

			user = await get_user_by_name(username)

			if not user.is_2fa_enabled:
				return await sendResponse(self, False, "2FA not enabled", 401)

			hashed_recovery_code = sha256_hash(recovery_code)

			is_recovery_code_valid = await self.verify_recovery_code(user, hashed_recovery_code)

			if not is_recovery_code_valid:
				return await sendResponse(self, False, "Invalid recovery code", 401)

			await self.remove_recovery_code(user, hashed_recovery_code)

			response_data = {
				'success': True,
				'message': 'Login successful',
				'username': username,
			}
			return await self.send_response(200, json.dumps(response_data).encode(),
				headers=[(b"Content-Type", b"application/json"), (b"Set-Cookie", generate_jwt_cookie(user))])
		except Exception as e:
			return await sendResponse(self, False, str(e), 500)

	@database_sync_to_async
	def verify_recovery_code(self, user, recovery_code):
		from api.models import RecoveryCode
		return RecoveryCode.objects.filter(user=user, recovery_code=recovery_code).exists()

	@database_sync_to_async
	def remove_recovery_code(self, user, recovery_code):
		from api.models import RecoveryCode
		RecoveryCode.objects.filter(user=user, recovery_code=recovery_code).delete()
