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
def update_recovery_codes_generated(user, recovery_codes_generated):
	user.recovery_codes_generated = recovery_codes_generated
	user.save()

@database_sync_to_async
def finish_game_history(game_id, score_a, score_b, elo_change, winner):
	from .models import GameHistory
	game = GameHistory.objects.get(id=game_id)
	if (game):
		game.score_a = score_a
		game.score_b = score_b
		game.status = "finished"
		game.elo_change = elo_change
		game.winner = winner
		game.save()
		logging.getLogger('game').info(f"Game {game_id} finished with score {score_a} - {score_b} and elo change {elo_change} for player A : {game.player_a} and player B : {game.player_b} state is now {game.status} for the mode {game.game_mode} the winner is {game.winner}")
	else:
		logging.getLogger('game').error(f"Game {game_id} not found")

@database_sync_to_async
def delete_game_history(game_id):
	from .models import GameHistory
	game = GameHistory.objects.get(id=game_id)
	if (game):
		game.delete()
	else:
		logging.getLogger('game').error(f"Game {game_id} not found couldn't delete")

@database_sync_to_async
def get_user_preference(user):
	from .models import UserPreference
	return UserPreference.objects.get(user=user)

@database_sync_to_async
def get_user_statistic(user):
	from .models import UserStatistic
	return UserStatistic.objects.get(user=user)
