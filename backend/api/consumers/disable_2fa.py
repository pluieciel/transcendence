from channels.generic.http import AsyncHttpConsumer
from channels.db import database_sync_to_async
from api.utils import jwt_to_user
from api.db_utils import update_is_2fa_enabled, update_recovery_codes_generated
import json

class Disable2FAConsumer(AsyncHttpConsumer):
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

			if not user.is_2fa_enabled:
				response_data = {
					'success': False,
					'message': '2FA not enabled'
				}
				return await self.send_response(409, json.dumps(response_data).encode(),
					headers=[(b"Content-Type", b"application/json")])
			
			await update_is_2fa_enabled(user, False)
			await update_recovery_codes_generated(user, False)
			await self.remove_recovery_codes(user)

			response_data = {
				'success': True,
				'message': '2FA disabled',
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

	@database_sync_to_async
	def remove_recovery_codes(self, user):
		from api.models import RecoveryCode
		RecoveryCode.objects.filter(user=user).delete()