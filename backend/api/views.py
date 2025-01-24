import time
from secrets import token_bytes, token_urlsafe
from channels.generic.http import AsyncHttpConsumer
from django.contrib.auth import get_user_model, authenticate
from channels.db import database_sync_to_async
from dotenv import load_dotenv
import json, os
import requests
import jwt
import datetime
import re
from django.core.files.base import ContentFile
from django.core.cache import cache
from PIL import Image
import io
import qrcode
import qrcode.image.svg
import hmac
import hashlib
import base64

def get_cookie(headers, name):
	cookies = headers.get('cookie', None)
	return re.search(f'{name}=([^;]+)', cookies)

async def jwt_to_user(headers):
	@database_sync_to_async
	def get_user(user_id):
		User = get_user_model()
		return User.objects.get(id=user_id)

	try:
		headers_dict = dict((key.decode('utf-8'), value.decode('utf-8')) for key, value in headers)
		jwt_cookie = get_cookie(headers_dict, 'jwt')
		if jwt_cookie:
			token = jwt_cookie.group(1)
			jwt_secret = get_secret_from_file('JWT_SECRET_KEY_FILE')
			payload = jwt.decode(token, jwt_secret, ['HS256'])
			user = await get_user(payload.get('id'))
			if user:
				return user
		return False

	except jwt.ExpiredSignatureError:
		return False
	except jwt.InvalidTokenError:
		return False

def generate_jwt(user, iat, exp):
	jwt_secret = get_secret_from_file('JWT_SECRET_KEY_FILE')

	return jwt.encode({
		'id': user.id,
		'username': user.username,
		'is_admin': user.is_admin,
		'iat': iat,
		'exp': exp
	}, jwt_secret, algorithm='HS256')

def generate_jwt_cookie(user):
	iat = datetime.datetime.now(datetime.UTC)
	exp = iat + datetime.timedelta(hours=1)

	jwt_cookie = (
			"jwt=" + generate_jwt(user, iat, exp)
			+ "; Expires=" + exp.strftime("%a, %d %b %Y %H:%M:%S GMT")
			+ "; HttpOnly; Secure; SameSite=Strict; Path=/"
	)
	return str.encode(jwt_cookie)

def generate_totp(secret, offset):
	time_counter = int(time.time() // 30) + offset
	time_bytes = time_counter.to_bytes(8, 'big')

	hmac_res = hmac.digest(base64.b32decode(secret), time_bytes, hashlib.sha1)
	hmac_off = hmac_res[19] & 0xf
	bin_code = ((hmac_res[hmac_off] & 0x7f) << 24
				| (hmac_res[hmac_off + 1] & 0xff) << 16
				| (hmac_res[hmac_off + 2] & 0xff) << 8
				| (hmac_res[hmac_off + 3] & 0xff))

	return bin_code % 1000000

def verify_totp(totp_secret, totp_input):
	for offset in [-2, -1, 0, 1]:
		totp = generate_totp(totp_secret, offset)
		if totp == int(totp_input):
			return True
	return False

def get_secret_from_file(env_var):
	file_path = os.environ.get(env_var)
	if file_path is None:
		raise ValueError(f'{env_var} environment variable not set')
	with open(file_path, 'r') as file:
		return file.read().strip()

class SignupConsumer(AsyncHttpConsumer):
	async def handle(self, body):
		# Rate limiting logic
		key = self.scope['client'][0]  # Use the client's IP address as the key
		rate_limit = 60  # Allow 5 requests
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
			data = await self.parse_multipart_form_data(body)
			username = data.get('username')
			password = data.get('password')
			avatar = data.get('avatar')

			# Validate input
			if not (self.is_valid_username(username)):
				response_data = {
					'success': False,
					'message': 'Username invalid'
				}
				return await self.send_response(400, json.dumps(response_data).encode(),
					headers=[(b"Content-Type", b"application/json")])

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

	def is_valid_username(self, username):
		regex = r'^[a-zA-Z0-9]+$'
		return bool(re.match(regex, username))

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
		rate_limit = 60  # Allow 5 requests
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

			is_2fa_enabled = user.is_2fa_enabled

			if not is_2fa_enabled:
				response_data = {
					'success': True,
					'message': 'Login successful',
					'color' : user.color,
					'username': username,
				}
			else:
				response_data = {
					'success': True,
					'message': '2FA required',
					'is_2fa_enabled': is_2fa_enabled,
				}

			return await self.send_response(200, json.dumps(response_data).encode(),
				headers=[(b"Content-Type", b"application/json"), (b"Set-Cookie", generate_jwt_cookie(user))])

		except Exception as e:
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

class Login2FAConsumer(AsyncHttpConsumer):
	async def handle(self, body):
		try:
			data = json.loads(body.decode())
			totp_input = data.get('totp')
			username = data.get('username')

			user = await self.get_user_by_name(username)

			is_totp_valid = verify_totp(user.totp_secret, totp_input)

			if not is_totp_valid:
				response_data = {
					'success': False,
					'message': 'Invalid totp code'
				}
				return await self.send_response(401, json.dumps(response_data).encode(),
					headers=[(b"Content-Type", b"application/json")])

			response_data = {
				'success': True,
				'message': 'Login successful',
				'username': username,
			}
			return await self.send_response(200, json.dumps(response_data).encode(),
				headers=[(b"Content-Type", b"application/json"), (b"Set-Cookie", generate_jwt_cookie(user))])
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

class Enable2FAConsumer(AsyncHttpConsumer):
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
			totp_input = data.get('totp')

			is_totp_valid = verify_totp(user.totp_secret, totp_input)

			if not is_totp_valid:
				response_data = {
					'success': False,
					'message': 'Invalid totp code'
				}
				return await self.send_response(401, json.dumps(response_data).encode(),
					headers=[(b"Content-Type", b"application/json")])

			await self.update_is_2fa_enabled(user, True)

			response_data = {
				'success': True,
				'message': '2FA enabled',
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
	def update_is_2fa_enabled(self, user, is_2fa_enabled):
		user.is_2fa_enabled = is_2fa_enabled
		user.save()

class UpdateConsumer(AsyncHttpConsumer):
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
			user = await jwt_to_user(self.scope['headers'])
			if not user:
				response_data = {
					'success': False,
					'message': 'Invalid token or User not found'
				}
				return await self.send_response(401, json.dumps(response_data).encode(),
					headers=[(b"Content-Type", b"application/json")])

			data = await self.parse_multipart_form_data(body)
			password = data.get('password')
			nickname = data.get('nickname')
			avatar = data.get('avatar')

			if avatar:
				image_bytes = avatar.file.read()
				image = Image.open(io.BytesIO(image_bytes))
				resized_image = image.resize((60, 60), Image.Resampling.LANCZOS)
				img_byte_arr = io.BytesIO()
				resized_image.save(img_byte_arr, format=image.format or 'PNG')
				img_byte_arr.seek(0)
				avatar.file = img_byte_arr
				await self.update_avatar(user, avatar)

			if password:
				await self.update_password(user, password)

			if nickname:
				await self.update_nickname(user, nickname)

			response_data = {
				'success': True,
				'message': 'Update successful'
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
	def update_avatar(self, user, avatar):
		user.avatar.save(avatar.name, ContentFile(avatar.file.read()), save=True)

	@database_sync_to_async
	def update_password(self, user, pw):
		user.set_password(pw)
		user.save()

	@database_sync_to_async
	def update_nickname(self, user, nn):
		user.nickname = nn
		user.save()

	async def parse_multipart_form_data(self, body):
		"""Parse multipart form data and return a dictionary."""
		from django.http import QueryDict
		data = QueryDict(mutable=True)
		boundary = body.split(b'\r\n')[0]
		parts = body.split(boundary)[1:-1]  # Ignore the first and last parts (which are empty)
		for part in parts:
			if b'Content-Disposition' in part:
				headers, content = part.split(b'\r\n\r\n', 1)
				headers = headers.decode('utf-8')
				content = content.rstrip(b'\r\n')  # Remove trailing newlines
				name = None
				filename = None
				for line in headers.splitlines():
					if 'name="' in line:
						name = line.split('name="')[1].split('"')[0]
					if 'filename="' in line:
						filename = line.split('filename="')[1].split('"')[0]
				if filename:
					data[name] = ContentFile(content, name=filename)
				else:
					data[name] = content.decode('utf-8')
		return data

class OAuthConsumer(AsyncHttpConsumer):
	async def handle(self, body):
		try:
			client_id = get_secret_from_file('OAUTH_CLIENT_ID_FILE')
			redirect_uri = os.environ.get('OAUTH_REDIRECT_URI')
			auth_url = (
				f"https://api.intra.42.fr/oauth/authorize?"
				f"client_id={client_id}&"
				f"redirect_uri={redirect_uri}&"
				f"response_type=code&"
				f"scope=public"
			)

			response_data = {
				'success': True,
				'auth_url': auth_url,
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

class LoginOAuthConsumer(AsyncHttpConsumer):
	async def handle(self, body):
		try:
			data = json.loads(body.decode())
			code = data.get('token')

			client_id = get_secret_from_file('OAUTH_CLIENT_ID_FILE')
			client_secret = get_secret_from_file('OAUTH_CLIENT_SECRET_FILE')

			url = 'https://api.intra.42.fr/oauth/token'
			params = {
				'grant_type': 'authorization_code',
				'client_id': client_id,
				'client_secret': client_secret,
				'code': code,
				'redirect_uri': os.environ.get('OAUTH_REDIRECT_URI')
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
				username = user_data['login']

				user = await self.get_user_by_name(username)
				if not user:
					user = await self.create_user_oauth(username=username, avatarUrl=user_data['image']['link'])

				response_data = {
					'success': True,
					'message': 'Login successful',
					'username': username,
					'color' : user.color,
				}
				return await self.send_response(200, json.dumps(response_data).encode(),
					headers=[(b"Content-Type", b"application/json"), (b"Set-Cookie", generate_jwt_cookie(user))])
			else:
				response_data = {
					'success': False,
					'message': f"Failed to fetch user: {user_response.json()}"
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
	def create_user_oauth(self, username, avatarUrl):
		User = get_user_model()
		return User.objects.create_user_oauth(username=username, avatarUrl=avatarUrl)

	@database_sync_to_async
	def get_user_by_name(self, username):
		User = get_user_model()
		return User.objects.filter(username=username).first()

class ProfileConsumer(AsyncHttpConsumer):
	async def handle(self, body):
		try:
			user = await jwt_to_user(self.scope['headers'])
			if not user:
				response_data = {
					'success': False,
					'message': 'User not found'
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
			user = await jwt_to_user(self.scope['headers'])
			if not user:
				response_data = {
					'success': False,
					'message': 'Invalid token or User not found'
				}
				return await self.send_response(401, json.dumps(response_data).encode(),
					headers=[(b"Content-Type", b"application/json")])

			path = self.scope['path']
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
			user = await jwt_to_user(self.scope['headers'])
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
			if (user.oauthlog):
				print('avatar link ', flush=True)
				print(user.avatar42, flush=True)
				response_data['avatar'] = user.avatar42
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
