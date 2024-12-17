# views.py
from channels.generic.http import AsyncHttpConsumer
from django.contrib.auth import get_user_model, authenticate
from channels.db import database_sync_to_async
import json
import logging
import requests

logger = logging.getLogger(__name__)


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

class SignupOAuthConsumer(AsyncHttpConsumer):
    async def handle(self, body):
        try:
            data = json.loads(body.decode())
            token = data.get('token')

            url = 'https://api.intra.42.fr/v2/me'
            headers = {
                'Authorization': f'Bearer {token}'
            }

            response = requests.get(url, headers=headers)

            if response.status_code == 200:
                user_data = response.json()
                print(user_data)
            else:
                response_data = {
                    'success': False,
                    'message': str(e)
                }
                return await self.send_response(500, json.dumps(response_data).encode(),
                    headers=[(b"Content-Type", b"application/json")])

            await self.create_user_oauth(user_data['login'], token)
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

            # Login successful
            response_data = {
                'success': True,
                'message': 'Login successful',
                'user': {
                    'username': user.username,
                    'id': user.id
                }
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

class ProfileConsumer(AsyncHttpConsumer):
    async def handle(self, body):
        try:
            data = json.loads(body.decode())
            username = data.get('username')
            
            # Validate input
            if not username:
                response_data = {
                    'success': False,
                    'message': 'Username is required'
                }
                return await self.send_response(400, json.dumps(response_data).encode(),
                    headers=[(b"Content-Type", b"application/json")])
            
            # Fetch user and elo
            user = await self.get_user(username)
            if not user:
                response_data = {
                    'success': False,
                    'message': 'User not found'
                }
                return await self.send_response(404, json.dumps(response_data).encode(),
                    headers=[(b"Content-Type", b"application/json")])
            
            tot_games = (user.win + user.loss)
            if tot_games == 0:
                winrate = 0
            else:
                winrate = (user.win / tot_games) * 100

            response_data = {
                'success': True,
                'elo': user.elo,
                'winrate': winrate,
                'tourn': user.tourn_win,
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
    def get_user(self, username):
        User = get_user_model()
        return User.objects.filter(username=username).first()      

