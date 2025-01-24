from channels.generic.http import AsyncHttpConsumer
from django.contrib.auth import get_user_model
from channels.db import database_sync_to_async
from .utils import jwt_to_user
import json

class RemoveConsumer(AsyncHttpConsumer):
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
			data = json.loads(body.decode())
			username = data.get('username')

			if not username:
				response_data = {
					'success': False,
					'message': 'Username is required'
				}
				return await self.send_response(400, json.dumps(response_data).encode(),
					headers=[(b"Content-Type", b"application/json")])

			if not await self.get_user_exists(username):
				response_data = {
					'success': False,
					'message': 'Username doesnt exists'
				}
				return await self.send_response(400, json.dumps(response_data).encode(),
					headers=[(b"Content-Type", b"application/json")])

			if await self.remove_user(username, user.id):
				response_data = {
					'success': True,
					'message': "Deleted user successfully"
				}
				return await self.send_response(200, json.dumps(response_data).encode(),
					headers=[(b"Content-Type", b"application/json")])
			response_data = {
				'success': False,
				'message': "Failed to remove the user from the database"
			}
			return await self.send_response(500, json.dumps(response_data).encode(),
				headers=[(b"Content-Type", b"application/json")])


		except Exception as e:
			response_data = {
				'success': False,
				'message': str(e)
			}
			return await self.send_response(500, json.dumps(response_data).encode(),
				headers=[(b"Content-Type", b"application/json")])

	@database_sync_to_async
	def get_user_exists(self, username):
		User = get_user_model()
		return User.objects.filter(username=username).exists()

	@database_sync_to_async
	def create_user(self, username, password):
		User = get_user_model()
		user = User.objects.create_user(
			username=username,
			password=password
		)
		return user

	@database_sync_to_async
	def remove_user(self, username, uid):
		try:
			User = get_user_model()
			u = User.objects.get(username = username, id = uid)
			u.delete()
			return True
		except Exception as e:
			return False
class setNewUsername(AsyncHttpConsumer):
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
			data = json.loads(body.decode())
			username = data.get('username')
			newUsername = data.get('newUsername')

			if not username:
				response_data = {
					'success': False,
					'message': 'Username is required'
				}
				return await self.send_response(400, json.dumps(response_data).encode(),
					headers=[(b"Content-Type", b"application/json")])

			if not await self.get_user_exists(username):
				response_data = {
					'success': False,
					'message': 'Username doesnt exists'
				}
				return await self.send_response(400, json.dumps(response_data).encode(),
					headers=[(b"Content-Type", b"application/json")])

			if await self.change_username(username, user.id, newUsername):
				response_data = {
					'success': True,
					'message': "Changed username successfully",
				}
				return await self.send_response(200, json.dumps(response_data).encode(),
					headers=[(b"Content-Type", b"application/json")])
			response_data = {
				'success': False,
				'message': str(e)
			}
			return await self.send_response(500, json.dumps(response_data).encode(),
				headers=[(b"Content-Type", b"application/json")])

		except Exception as e:
			response_data = {
				'success': False,
				'message': str(e)
			}
			return await self.send_response(500, json.dumps(response_data).encode(),
				headers=[(b"Content-Type", b"application/json")])

	@database_sync_to_async
	def get_user_exists(self, username):
		User = get_user_model()
		return User.objects.filter(username=username).exists()

	@database_sync_to_async
	def create_user(self, username, password):
		User = get_user_model()
		user = User.objects.create_user(
			username=username,
			password=password
		)
		return user

	@database_sync_to_async
	def change_username(self, username, uid, newUsername):
		try:
			User = get_user_model()
			u = User.objects.get(username=username, id=uid)
			if User.objects.filter(username=newUsername).exists():
				return False
			u.username = newUsername
			u.save()
			return True
		except Exception as e:
			return False
		
class setPreferences(AsyncHttpConsumer):
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

			data = json.loads(body.decode())
			if not await self.change_color(user, data.get('newColor')) or not await self.change_quality(user, data.get('newQuality')):
				response_data = {
					'success': False,
					'message': 'Failed to set color'
				}
				return await self.send_response(500, json.dumps(response_data).encode(),
					headers=[(b"Content-Type", b"application/json")])

			response_data = {
				'success': True,
				'color': user.color,
				'message': 'Color set successfully'
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
	def change_color(self, user, newcolor):
		try:
			user.color = newcolor
			user.save()
			return True
		except Exception as e:
			return False

	@database_sync_to_async
	def change_quality(self, user, quality):
		try:
			user.quality = quality
			user.save()
			return True
		except Exception as e:
			return False
