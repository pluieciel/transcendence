from django.contrib.auth import get_user_model
from channels.db import database_sync_to_async
from dotenv import load_dotenv
import os
import jwt

async def jwt_to_user(token):
    @database_sync_to_async
    def get_user(user_id):
        User = get_user_model()
        return User.objects.get(id=user_id)

    try:
        load_dotenv()
        secret = os.getenv("SECRET_KEY")
        payload = jwt.decode(token, secret, algorithms=['HS256'])
        user = await get_user(payload.get('user_id'))
        if user:
            return user
        else:
            return False

    except jwt.ExpiredSignatureError:
        return False
    except jwt.InvalidTokenError:
        return False
    
async def check_jwt(self):
    headers = dict((key.decode('utf-8'), value.decode('utf-8')) for key, value in self.scope['headers'])
    auth_header = headers.get('authorization', None)
    if not auth_header:
        response_data = {
            'success': False,
            'message': 'Authorization header missing'
        }
        raise "Authorization header missing"
    user = await jwt_to_user(auth_header)
    if not user:
        response_data = {
            'success': False,
            'message': 'Invalid token or User not found'
        }
        raise "Invalid token or User not found"
    return user
