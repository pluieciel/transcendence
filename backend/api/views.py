# views.py
from channels.generic.http import AsyncHttpConsumer
from django.contrib.auth import get_user_model, authenticate
from channels.db import database_sync_to_async
import json
import jwt
import datetime

SECRET_KEY = 'ultrasafe_secret_key'

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
    

    
class SignupConsumer(AsyncHttpConsumer):
    async def handle(self, body):
        try:
            data = json.loads(body.decode())
            username = data.get('username')
            password = data.get('password')
            
            #print(f"Signup attempt: {username}", flush=True)
            
            # Validate input
            if not username or not password:
                response_data = {
                    'success': False,
                    'message': 'Username and password are required'
                }
                return await self.send_response(400, json.dumps(response_data).encode(),
                    headers=[(b"Content-Type", b"application/json")])

            # Check if username exists
            if await self.get_user_exists(username):
                response_data = {
                    'success': False,
                    'message': 'Username already exists'
                }
                return await self.send_response(400, json.dumps(response_data).encode(),
                    headers=[(b"Content-Type", b"application/json")])

            # Create new user
            await self.create_user(username, password)
            
            response_data = {
                'success': True,
                'message': 'Signup successful'
            }
            
            return await self.send_response(201, 
                json.dumps(response_data).encode(),
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

class LoginConsumer(AsyncHttpConsumer):
    async def handle(self, body):
        try:
            data = json.loads(body.decode())
            username = data.get('username')
            password = data.get('password')
            
            #print(f"Login attempt: {username}", flush=True)
            
            # Validate input
            if not username or not password:
                response_data = {
                    'success': False,
                    'message': 'Username and password are required'
                }
                return await self.send_response(400, json.dumps(response_data).encode(),
                    headers=[(b"Content-Type", b"application/json")])

            if not await self.get_user_exists(username):
                response_data = {
                    'success': False,
                    'message': 'Username doesn\'t exist'
                }
                return await self.send_response(400, json.dumps(response_data).encode(),
                    headers=[(b"Content-Type", b"application/json")])
            
            # Authenticate user
            user = await self.authenticate_user(username, password)
            if not user:
                response_data = {
                    'success': False,
                    'message': 'Invalid credentials'
                }
                return await self.send_response(401, json.dumps(response_data).encode(),
                    headers=[(b"Content-Type", b"application/json")])

            # Generate JWT
            token = jwt.encode({
                'user_id': user.id,
                'exp': datetime.datetime.now(datetime.UTC) + datetime.timedelta(hours=1)
            }, SECRET_KEY, algorithm='HS256')

            # Login successful
            response_data = {
                'success': True,
                'message': 'Login successful',
                'token': token,
                'user': {
                    'username': user.username,
                    'id': user.id
                },
            }
            
            return await self.send_response(200, json.dumps(response_data).encode(),
                headers=[(b"Content-Type", b"application/json")])

        except Exception as e:
            print(f"Login error: {str(e)}", flush=True)
            response_data = {
                'success': False,
                'message': str(e)
            }
            return await self.send_response(500, json.dumps(response_data).encode(),
                headers=[(b"Content-Type", b"application/json")])

    @database_sync_to_async
    def authenticate_user(self, username, password):
        user = authenticate(username=username, password=password)
        return user

    @database_sync_to_async
    def get_user_exists(self, username):
        User = get_user_model()
        return User.objects.filter(username=username).exists()

class EloConsumer(AsyncHttpConsumer):
    async def handle(self, body):
        try:
            #print(self.scope, flush=True)
            headers = dict((key.decode('utf-8'), value.decode('utf-8')) for key, value in self.scope['headers'])
            #print(headers, flush=True)
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
            
            response_data = {
                'success': True,
                'elo': user.elo
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
    def get_user(self, user_id):
        User = get_user_model()
        return User.objects.get(id=user_id)
