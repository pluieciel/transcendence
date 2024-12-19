# views.py
from channels.generic.http import AsyncHttpConsumer
from django.contrib.auth import get_user_model, authenticate
from channels.db import database_sync_to_async
import json
import logging
import requests
import jwt
import datetime

SECRET_KEY = 'ultrasafe_secret_key'
logger = logging.getLogger(__name__)

async def jwt_to_user(token):
    @database_sync_to_async
    def get_user(user_id):
        User = get_user_model()
        return User.objects.get(id=user_id)

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        user = await get_user(payload.get('user_id'))
        if user:
            return user
        else:
            return False

    except jwt.ExpiredSignatureError:
        return False
    except jwt.InvalidTokenError:
        return False

class RemoveConsumer(AsyncHttpConsumer):
    async def handle(self, body):
        try:
            headers = dict((key.decode('utf-8'), value.decode('utf-8')) for key, value in self.scope['headers'])
            auth_header = headers.get('authorization', None)
            if not auth_header:
                response_data = {
                    'success': False,
                    'message': 'Authorization header missing'
                }
                return await self.send_response(401, json.dumps(response_data).encode(),
                    headers=[(b"Content-Type", b"application/json")])
            user = await jwt_to_user(auth_header)
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
    def remove_user(self, username, uid):
        try:
            User = get_user_model()
            u = User.objects.get(username = username, id = uid)
            u.delete()
            return True
        except Exception as e:
            logger.error(f"Error removing user: {str(e)}")
            return False
