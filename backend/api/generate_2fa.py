from channels.generic.http import AsyncHttpConsumer
from channels.db import database_sync_to_async
from .utils import jwt_to_user, generate_totp
from secrets import token_bytes
import time
import json
import qrcode
import qrcode.image.svg
import base64

class Generate2FAConsumer(AsyncHttpConsumer):
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

			if user.totp_secret is None:
				totp_secret = self.generate_totp_secret()
				await self.update_totp_secret(user, totp_secret)

			response_data = {
				'success': True,
				'qr_code': self.generate_qr_code(user),
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
	def update_totp_secret(self, user, totp_secret):
		user.totp_secret = totp_secret
		user.save()

	def generate_qr_code(self, user):
		qr_code = qrcode.QRCode(image_factory=qrcode.image.svg.SvgPathImage)
		data = 'otpauth://totp/' + user.username + '?secret=' + user.totp_secret + '&issuer=ft_transcendence'
		qr_code.add_data(data)
		qr_code.make(fit=True)
		return qr_code.make_image().to_string(encoding='unicode')

	def generate_totp_secret(self):
		current_time = int(time.time())
		time_bytes = current_time.to_bytes(4, 'big')
		return base64.b32encode(token_bytes(16) + time_bytes).decode()