from django.contrib.auth import get_user_model
from channels.db import database_sync_to_async
import logging

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
def update_is_2fa_enabled(user, is_2fa_enabled):
	user.is_2fa_enabled = is_2fa_enabled
	user.save()

@database_sync_to_async
def update_user_elo(user, elo):
	user.elo = elo
	user.save()

@database_sync_to_async
def add_user_wins(user):
	user.wins += 1
	logging.getLogger('game').info(f"User {user.username} wins: {user.wins}, loses : {user.looses}")
	user.save()

@database_sync_to_async
def add_user_looses(user):
	user.looses += 1
	logging.getLogger('game').info(f"User {user.username} wins: {user.wins}, loses : {user.looses}")
	user.save()

@database_sync_to_async
def update_recovery_codes_generated(user, recovery_codes_generated):
	user.recovery_codes_generated = recovery_codes_generated
	user.save()

@database_sync_to_async
def connect_user(user):
	try:
		if (user.is_connected):
			return False
		user.is_connected = True
		user.save()
		print("Connected", flush=True)
		return True
	except Exception as e:
		return False

@database_sync_to_async
def disconnect_user(user):
	try:
		user.is_connected = False
		user.save()
		print("Disconnected", flush=True)
		return True
	except Exception as e:
		print(e, flush=True)
		return False
