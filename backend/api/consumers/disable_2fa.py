from channels.generic.http import AsyncHttpConsumer
from channels.db import database_sync_to_async
from api.utils import jwt_to_user
from api.db_utils import update_is_2fa_enabled, update_recovery_codes_generated, sendResponse, sendBadJWT
import json

class Disable2FAConsumer(AsyncHttpConsumer):
	async def handle(self, body):
		try:
			user = await jwt_to_user(self.scope['headers'])
			if not user:
				return await sendBadJWT(self)

			if not user.is_2fa_enabled:
				return await sendResponse(self, False, "2FA not enabled", 409)
			
			await update_is_2fa_enabled(user, False)
			await update_recovery_codes_generated(user, False)
			await self.remove_recovery_codes(user)

			return await sendResponse(self, True, "2FA disabled", 200)
		except Exception as e:
			return await sendResponse(self, False, str(e), 500)

	@database_sync_to_async
	def remove_recovery_codes(self, user):
		from api.models import RecoveryCode
		RecoveryCode.objects.filter(user=user).delete()