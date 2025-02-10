from channels.generic.http import AsyncHttpConsumer
from api.utils import jwt_to_user
import json

class AdminConsumer(AsyncHttpConsumer):
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
			
			if not user.is_admin:
				response_data = {
					'success': False,
					'message': 'User is not an admin'
				}
				return await self.send_response(401, json.dumps(response_data).encode(),
					headers=[(b"Content-Type", b"application/json")])

			response_data = {
				'success': True,
				'admin_view': self.get_admin_view(),
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

	def get_admin_view(self):
		return """ """