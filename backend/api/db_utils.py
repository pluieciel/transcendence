from django.contrib.auth import get_user_model
from channels.db import database_sync_to_async

@database_sync_to_async
def user_update_game(user, isplaying, game_id):
	user.isplaying = isplaying
	user.current_game_id = game_id
	user.save()

@database_sync_to_async
def get_user_exists(username):
	User = get_user_model()
	return User.objects.filter(username=username).exists()

@database_sync_to_async
def get_user_by_name(username):
	User = get_user_model()
	return User.objects.filter(username=username).first()

@database_sync_to_async
def get_user(user_id):
	User = get_user_model()
	return User.objects.get(id=user_id)

@database_sync_to_async
def user_update_is_2fa_enabled(user, is_2fa_enabled):
	user.is_2fa_enabled = is_2fa_enabled
	user.save()