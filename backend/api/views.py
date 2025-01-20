# views.py
from channels.generic.http import AsyncHttpConsumer
from django.contrib.auth import get_user_model, authenticate
from channels.db import database_sync_to_async
from .utils import jwt_to_user
import json
from dotenv import load_dotenv
import json, os
import logging
import requests
import jwt
import datetime
import re
from django.core.files.base import ContentFile
from django.core.cache import cache
from PIL import Image
import io

SECRET_KEY = os.environ.get('JWT_SECRET_KEY')
logger = logging.getLogger(__name__)

class SignupConsumer(AsyncHttpConsumer):
    async def handle(self, body):
        # Rate limiting logic
        key = self.scope['client'][0]  # Use the client's IP address as the key
        rate_limit = 20  # Allow 5 requests
        time_window = 60  # Time window in seconds
        current_usage = cache.get(key, 0)
        #print(json.loads(body.decode()), flush=True)
        #print("current usage: " + str(current_usage), flush=True)
        if current_usage >= rate_limit:
            response_data = {
                'success': False,
                'message': 'Too many requests. Please try again later.'
            }
            return await self.send_response(429, json.dumps(response_data).encode(),
                headers=[(b"Content-Type", b"application/json")])
        cache.set(key, current_usage + 1, timeout=time_window)

        try:
            data = await self.parse_multipart_form_data(body)
            username = data.get('username')
            password = data.get('password')
            avatar = data.get('avatar')
                
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

            if avatar:
                # Read raw bytes from ContentFile
                image_bytes = avatar.file.read()
                # Open and resize image
                image = Image.open(io.BytesIO(image_bytes))
                resized_image = image.resize((60, 60), Image.Resampling.LANCZOS)
                # Save resized image to bytes
                img_byte_arr = io.BytesIO()
                resized_image.save(img_byte_arr, format=image.format or 'PNG')
                img_byte_arr.seek(0)
                # Update avatar with resized image
                avatar.file = img_byte_arr
            # Create new user
            await self.create_user(username, password, avatar)

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
    def create_user(self, username, password, avatar):
        User = get_user_model()
        user = User.objects.create_user(
            username=username,
            password=password,
            avatar=avatar
        )
        return user
    
    async def parse_multipart_form_data(self, body):
        """Parse multipart form data and return a dictionary."""
        from django.http import QueryDict
        #from django.utils.datastructures import MultiValueDict

        # Create a QueryDict to hold the parsed data
        data = QueryDict(mutable=True)

        # Split the body into parts
        boundary = body.split(b'\r\n')[0]
        parts = body.split(boundary)[1:-1]  # Ignore the first and last parts (which are empty)

        for part in parts:
            if b'Content-Disposition' in part:
                # Split the part into headers and content
                headers, content = part.split(b'\r\n\r\n', 1)
                headers = headers.decode('utf-8')
                content = content.rstrip(b'\r\n')  # Remove trailing newlines

                # Extract the name from the headers
                name = None
                filename = None
                for line in headers.splitlines():
                    if 'name="' in line:
                        name = line.split('name="')[1].split('"')[0]
                    if 'filename="' in line:
                        filename = line.split('filename="')[1].split('"')[0]

                # If it's a file, save it to the QueryDict
                if filename:
                    data[name] = ContentFile(content, name=filename)
                else:
                    data[name] = content.decode('utf-8')

        return data

class LoginConsumer(AsyncHttpConsumer):
    async def handle(self, body):
        # Rate limiting logic
        key = self.scope['client'][0]  # Use the client's IP address as the key
        rate_limit = 20  # Allow 5 requests
        time_window = 60  # Time window in seconds
        current_usage = cache.get(key, 0)
        if current_usage >= rate_limit:
            response_data = {
                'success': False,
                'message': 'Too many requests. Please try again later.'
            }
            return await self.send_response(429, json.dumps(response_data).encode(),
                headers=[(b"Content-Type", b"application/json")])
        cache.set(key, current_usage + 1, timeout=time_window)

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
                'id': user.id,
                'username': user.username,
                'exp': datetime.datetime.now(datetime.UTC) + datetime.timedelta(hours=1)
            }, SECRET_KEY, algorithm='HS256')

            # Login successful
            response_data = {
                'success': True,
                'message': 'Login successful',
                'token': token,
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
                'redirect_uri': 'https://10.11.2.6:9000/signup/oauth'
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
                if await self.get_user_exists(user_data['login'] + "42"):
                    response_data = {
                        'success': True,
                        'status': 200,
                        'message': 'Login successful',
                        'username': user_data['login'] + "42"
                    }
                else:
                    await self.create_user_oauth(user_data['login'] + "42")
                    response_data = {
                        'success': True,
                        'status': 201,
                        'message': 'Signup && Login successful',
                        'username': user_data['login'] + "42"
                    }
                user = await self.get_user(user_data['login'] + "42")
                
                load_dotenv()
                token = jwt.encode({
                    'user_id': user.id,
                    'exp': datetime.datetime.now(datetime.UTC) + datetime.timedelta(hours=1)
                }, os.getenv("SECRET_KEY"), algorithm='HS256')
                
                response_data['token'] = token
                response_data['theme'] = user.theme or "light"
                
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
    def create_user_oauth(self, username):
        User = get_user_model()
        user = User.objects.create_user_oauth(username=username)
        return user
    @database_sync_to_async
    def get_user_exists(self, username):
        User = get_user_model()
        return User.objects.filter(username=username).exists()
    @database_sync_to_async
    def get_user(self, username):
        User = get_user_model()
        return User.objects.get(username=username)

class ProfileConsumer(AsyncHttpConsumer):
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

            tot_games = (user.wins + user.looses)
            if tot_games == 0:
                winrate = "No games found"
            else:
                winrate = (user.wins / tot_games) * 100 + "%"

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
    def get_user(self, user_id):
        User = get_user_model()
        return User.objects.get(id=user_id)

class ProfileConsumer2(AsyncHttpConsumer):
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
            
            path = self.scope['path']
            #print(f"Request path: {path}", flush=True)
            match = re.search(r'/api/get/profile/(\w+)', path)
            user_name = match.group(1)
            user = await self.get_user_by_name(user_name)

            tot_games = (user.wins + user.looses)
            if tot_games == 0:
                winrate = 0
            else:
                winrate = (user.wins / tot_games) * 100

            response_data = {
                'username': user.username,
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
    def get_user(self, user_id):
        User = get_user_model()
        return User.objects.get(id=user_id)
    
    @database_sync_to_async
    def get_user_by_name(self, username):
        User = get_user_model()
        return User.objects.filter(username=username).first()
    
class AvatarConsumer(AsyncHttpConsumer):
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
            
            path = self.scope['path']
            match = re.search(r'/api/get/avatar/(\w+)', path)
            user_name = match.group(1)
            user = await self.get_user_by_name(user_name)
            host = 'https://' + next((value.decode('utf-8') for key, value in self.scope['headers'] if key == b'x-forwarded-host'), 'localhost:9000')
            if host == 'https://localhost:9000':
                host = next((value.decode('utf-8') for key, value in self.scope['headers'] if key == b'origin'), 'localhost:9000')
            #print(self.scope, flush=True)
            response_data = {
                'username': user.username,
                'success': True,
                'avatar' : f"{host}{user.avatar.url}" if user.avatar else f"{host}/default_avatar.png",
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
    def get_user_by_name(self, username):
        User = get_user_model()
        return User.objects.filter(username=username).first()