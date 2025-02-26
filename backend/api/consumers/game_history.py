from channels.generic.http import AsyncHttpConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.db.models import Q
from django.utils import timezone
from django.utils.timesince import timesince
from api.utils import jwt_to_user, get_user_avatar_url
from api.db_utils import get_user, get_user_by_name, sendResponse, sendBadJWT
import json

class GameHistoryConsumer(AsyncHttpConsumer):
	async def handle(self, body):
		try:
			user = await jwt_to_user(self.scope['headers'])
			if not user:
				return await sendBadJWT(self)

			profile_user = await get_user_by_name(self.scope['url_route']['kwargs']['username'])
			if not profile_user:
				return await sendResponse(self, False, "User not found", 404)

			game_histories = await self.get_game_histories(profile_user)

			response_data = {
				'success': True,
			}
			for index, game_history in enumerate(game_histories):
				player_left =  await self.get_player_left(game_history)
				player_right =  await self.get_player_right(game_history)
				winner = await self.get_winner(game_history)
				time_since_game = timesince(game_history.updated_at, timezone.now())
				if "," in time_since_game:
					time_since_game = time_since_game.split(",")[0]
				if "hours" in time_since_game or "hour" in time_since_game:
					time_since_game = time_since_game.split()[0] + " " + time_since_game.split()[1]
				time_since_game = time_since_game.strip() + " ago"

				response_data[f"game_history_{index}"] = {
					'id': game_history.id,
					'game_type': game_history.game_type,
					'game_mode': game_history.game_mode,
					'score_left': game_history.score_left,
					'score_right': game_history.score_right,
					'elo_change': game_history.elo_change,
					'time_since_game': time_since_game,
					'player_left': {
						'username': player_left.username,
						'name': player_left.display_name if player_left.display_name is not None else player_left.username,
						'avatar_url': get_user_avatar_url(player_left, self.scope['headers']),
						'is_winner': player_left.id == winner.id,
						'is_opponent': player_left.username != self.scope['url_route']['kwargs']['username'],
					},
					'player_right': {
						'username': player_right.username,
						'name': player_right.display_name if player_right.display_name is not None else player_right.username,
						'avatar_url': get_user_avatar_url(player_right, self.scope['headers']),
						'is_winner': player_right.id == winner.id,
						'is_opponent': player_right.username != self.scope['url_route']['kwargs']['username'],
					},
				}
			return await self.send_response(200, json.dumps(response_data).encode(),
				headers=[(b"Content-Type", b"application/json")])

		except Exception as e:
			import traceback
			return await sendResponse(self, False, str(traceback.format_exc()), 500)

	@database_sync_to_async
	def get_player_left(self, game_history):
		User = get_user_model()
		return User.objects.get(id=game_history.player_left.id)

	@database_sync_to_async
	def get_player_right(self, game_history):
		User = get_user_model()
		return User.objects.get(id=game_history.player_right.id)

	@database_sync_to_async
	def get_winner(self, game_history):
		User = get_user_model()
		return User.objects.get(id=game_history.winner.id)

	@database_sync_to_async
	def get_game_histories(self, user):
		from api.models import GameHistory
		return list(GameHistory.objects.filter((Q(player_left=user) | Q(player_right=user)) & Q(game_state='finished') & ~Q(game_type='tournament'))
			.order_by('-created_at')[:20])

