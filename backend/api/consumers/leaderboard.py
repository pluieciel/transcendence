from channels.generic.http import AsyncHttpConsumer
from django.contrib.auth import get_user_model
from channels.db import database_sync_to_async
from operator import itemgetter
from api.db_utils import get_user_by_name
import json

class getLeaderboard(AsyncHttpConsumer):
	async def handle(self, body):
		try:

			users = await self.getAllUsers()
			for user in users:
				u = await get_user_by_name(username=user['username'])
				user['avatar'] = await self.getAvatarForUser(u)
				user['games'] = user['wins'] + user['looses']
				user['link'] = "/profile/" + user['username']
				tot = user['games']
				if tot != 0:
					user['winrate'] = f"{(user['wins'] / tot) * 100:.2f}%"
				else:
					user['winrate'] = 'No games'

			sortedUsers = sorted(users, key=itemgetter('elo'), reverse=True)

			response_data = {
				'success': True,
				'users': sortedUsers,
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
	def getAllUsers(self):
		try:
			User = get_user_model()
			return list(User.objects.values('username', 'elo', 'wins', 'looses'))
		except Exception as e:
			return str(e)
		
	@database_sync_to_async
	def getAvatarForUser(self, user):
		try:
			if (user.avatar42):
				return (user.avatar42)
			elif (user.avatar):
				return (user.avatar.url)
			else:
				return ('imgs/default_avatar.png')
		except Exception as e:
			return str(e)