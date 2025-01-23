# views.py
from channels.generic.http import AsyncHttpConsumer
from django.contrib.auth import get_user_model, authenticate
from channels.db import database_sync_to_async
import json
import logging
from .utils import check_jwt

#SECRET_KEY = 'ultrasafe_secret_key'
logger = logging.getLogger(__name__)

class RemoveConsumer(AsyncHttpConsumer):
    async def handle(self, body):
        try:
            user = await check_jwt(self)
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
            logger.error(f"Error removing user: {str(e)}")
            return False

class setTheme(AsyncHttpConsumer):
    async def handle(self, body):
        try:
            user = await check_jwt(self)
            data = json.loads(body.decode())
            username = data.get('username')
            currentTheme = data.get('currentTheme')

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

            if await self.switch_theme(username, user.id, currentTheme):
                user = await check_jwt(self)
                response_data = {
                    'success': True,
                    'message': "Theme switched successfully",
                    'theme': user.theme
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
    def switch_theme(self, username, uid, currentTheme):
        try:
            User = get_user_model()
            u = User.objects.get(username=username, id=uid)
            u.theme = "dark" if currentTheme == "light" else "light"
            u.save()
            return True
        except Exception as e:
            logger.error(f"Error switching theme: {str(e)}")
            return False

class setNewUsername(AsyncHttpConsumer):
    async def handle(self, body):
        try:
            user = await check_jwt(self)
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
                logger.error(f"Username '{newUsername}' already exists.")
                return False
            u.username = newUsername
            u.save()
            return True
        except Exception as e:
            logger.error(f"Error switching theme: {str(e)}")
            return False
