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

class HandleOAuthConsumer(AsyncHttpConsumer):
    async def handle(self, body):
        try:
            data = json.loads(body.decode())
            code = data.get('token')

            url = 'https://api.intra.42.fr/oauth/token'
            params = {
                'grant_type': 'authorization_code',
                'client_id': 'u-s4t2ud-ba5b0c72367af9ad1efbf4d20585f3c315b613ece176ca16919733a7dba999d5',
                'client_secret': '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',
                'code': code,
                'redirect_uri': 'http://10.11.3.2:9000/signup/oauth'
            }

            response = requests.post(url, data=params)

            if response.status_code != 200:
                response_data = {
                    'success': False,
                    'message': f"Failed to exchange code for token. Status code: {response.status_code}"
                }
                return await self.send_response(500, json.dumps(response_data).encode(),
                    headers=[(b"Content-Type", b"application/json")])

            access_token = response.json()['access_token']
            headers = {
                'Authorization': f'Bearer {access_token}'
            }

            user_response = requests.get('https://api.intra.42.fr/v2/me', headers=headers)

            if user_response.status_code == 200:
                user_data = user_response.json()
                if await self.get_user_exists(user_data['login']):
                    response_data = {
                        'success': True,
						'status': 200,
                        'message': 'Login successful',
						'username': user_data['login']
                    }
                else:
                    await self.create_user_oauth(user_data['login'], access_token)
                    response_data = {
                        'success': True,
						'status': 201,
                        'message': 'Signup && Login successful',
						'username': user_data['login']
                    }
                return await self.send_response(response_data['status'], json.dumps(response_data).encode(),
                    headers=[(b"Content-Type", b"application/json")])
            else:
                response_data = {
                    'success': False,
                    'message': f"Failed to fetch user data. Status code: {user_response.status_code}"
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
    def create_user_oauth(self, username, token):
        User = get_user_model()
        user = User.objects.create_user_oauth(username=username, token=token)
        return user
    @database_sync_to_async
    def get_user_exists(self, username):
        User = get_user_model()
        return User.objects.filter(username=username).exists()

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

