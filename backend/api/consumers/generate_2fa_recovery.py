from channels.generic.http import AsyncHttpConsumer
from channels.db import database_sync_to_async
from api.utils import jwt_to_user, hash_password
from api.db_utils import update_recovery_codes_generated
from secrets import token_hex
import json

class Generate2FARecoveryConsumer(AsyncHttpConsumer):
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

			if user.recovery_codes_generated:
				response_data = {
					'success': False,
					'message': '2FA recovery codes already generated once'
				}
				return await self.send_response(409, json.dumps(response_data).encode(),
					headers=[(b"Content-Type", b"application/json")])

			recovery_codes = [token_hex(8) for _ in range(6)]
			for code in recovery_codes:
				await self.ucreate_recovery_code(user, hash_password(code))

			await update_recovery_codes_generated(user, True)

			response_data = {
				'success': True,
			}
			for i in range(6):
				response_data["recovery_code_" + str(i + 1)] = recovery_codes[i]

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
	def create_recovery_code(self, user, recovery_code):
		from api.models import RecoveryCode
		return RecoveryCode.objects.create(user=user, recovery_code=recovery_code)
