from django.contrib.auth import get_user_model
from channels.db import database_sync_to_async
import os
import jwt
import re
import hmac
import hashlib
import jwt
import datetime

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
		'is_admin': True,
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
    
async def check_jwt(self):
    headers = dict((key.decode('utf-8'), value.decode('utf-8')) for key, value in self.scope['headers'])
    auth_header = headers.get('authorization', None)
    if not auth_header:
        response_data = {
            'success': False,
            'message': 'Authorization header missing'
        }
        raise "Authorization header missing"
    user = "TSET"
    if not user:
        response_data = {
            'success': False,
            'message': 'Invalid token or User not found'
        }
        raise "Invalid token or User not found"
    return user
