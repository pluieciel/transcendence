from django.contrib.auth import get_user_model
from channels.db import database_sync_to_async
import logging
import json
from django.utils import timezone

@database_sync_to_async
def user_update_game(user, playing, game_id):
	try:
		user.playing = playing
		user.current_game_id = game_id
		logging.getLogger('game').info(f"User {user.username} is now playing : {playing}")
		user.save()
	except:
		pass

@database_sync_to_async
def user_update_tournament(user, tournament):
	try:
		user.tournament = tournament
		logging.getLogger('game').info(f"User {user.username} state tournament : {tournament}")
		user.save()
	except:
		pass

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
def update_game_history_player_right(game_id, player_right):
	from .models import GameHistory
	game = GameHistory.objects.get(id=game_id)
	if (game):
		game.player_right = player_right
		game.save()
	else:
		logging.getLogger('game').error(f"Game {game_id} not found")

@database_sync_to_async
def finish_game_history(game_id, score_left, score_right, elo_change, winner):
	from .models import GameHistory
	game = GameHistory.objects.get(id=game_id)
	if (game):
		game.score_left = score_left
		game.score_right = score_right
		game.status = "finished"
		game.elo_change = elo_change
		game.winner = winner
		game.save()
		logging.getLogger('game').info(f"Game {game_id} finished with score {score_left} - {score_right} and elo change {elo_change} for player A : {game.player_left} and player B : {game.player_right} state is now {game.status} for the mode {game.game_mode} the winner is {game.winner}")
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

@database_sync_to_async
def get_achievements(user):
	achievements = []
	for user_achievement in user.user_achievements.all().order_by('achievement__order'):
		achievements.append({
			'id': user_achievement.achievement.id,
			'name': user_achievement.achievement.name,
			'description': user_achievement.achievement.description,
			'color_unlocked': user_achievement.achievement.color_unlocked,
			'unlock_value': user_achievement.achievement.unlock_value,
			'category' : user_achievement.achievement.category,
			'unlocked': user_achievement.unlocked,
			'icon' : user_achievement.achievement.icon,
			'progression': user_achievement.progression,
			'order': user_achievement.achievement.order,
			'date_earned': user_achievement.date_earned.isoformat() if user_achievement.unlocked else None
		})
	return achievements

@database_sync_to_async
def get_achievements_stats(user):
	total_achievements = len(user.user_achievements.all())
	total_achievements_unlocked = len(user.user_achievements.filter(unlocked=True))

	return {
		"total_earned": str(total_achievements_unlocked) + "/" + str(total_achievements),
		"completion": f'{round((total_achievements_unlocked / total_achievements) * 100)}%',
	}

@database_sync_to_async
def get_profile_achievements(user):
	achievements = []
	for user_achievement in user.user_achievements.filter(unlocked=True).order_by('date_earned'):
		achievements.append({
			'name': user_achievement.achievement.name,
			'icon' : user_achievement.achievement.icon,
		})
	return achievements

@database_sync_to_async
def get_unlocked_colors(user):
	default_colors = [1, 2]
	user_unlocked_colors = user.user_achievements.filter(
			achievement__color_unlocked__isnull=False,
			achievement__color_unlocked__gt=-1,
			unlocked=True
		).values_list('achievement__color_unlocked', flat=True)
	return list(set(default_colors).union(user_unlocked_colors))

@database_sync_to_async
def is_color_unlocked(user, color):
	default_colors = {1, 2}
	if color in default_colors:
		return True
	return user.user_achievements.filter(
		achievement__color_unlocked=color,
		unlocked=True
	).exists()

@database_sync_to_async
def unlock_achievement(user, name):
	from .models import Achievement, UserAchievement
	
	achievement = Achievement.objects.filter(name=name).first()
	if not achievement:
		logging.getLogger('game').info(f"Achievement {name} not found")
		return False
		
	user_achievement = UserAchievement.objects.filter(
		user=user,
		achievement=achievement
	).first()

	if not user_achievement:
		logging.getLogger('game').info(f"UserAchievement for {name} not found for user {user.username}")
		return False
	
	if not user_achievement.unlocked:
		user_achievement.unlocked = True
		user_achievement.progression = achievement.unlock_value
		user_achievement.date_earned = timezone.now()
		user_achievement.save()
		logging.getLogger('game').info(f"Achievement {name} unlocked for user {user.username}")
	return True

@database_sync_to_async
def update_achievement_progression(user, name, progression):
	from .models import Achievement, UserAchievement
	
	achievement = Achievement.objects.filter(name=name).first()
	if not achievement:
		logging.getLogger('game').info(f"Achievement {name} not found")
		return False
		
	user_achievement = UserAchievement.objects.filter(
		unlocked=False,
		user=user,
		achievement=achievement
	).first()

	if not user_achievement:
		logging.getLogger('game').error(f"UserAchievement for {name} not found for user {user.username}")
		return False
	
	if (progression < user_achievement.progression):
		logging.getLogger('game').info(f"UserAchievement for {name} not updating progression in lesser than current")
		return
	logging.getLogger('game').info(f"UserAchievement for {name} updating, old value was {user_achievement.progression} new is {progression}")
	user_achievement.progression = progression
	user_achievement.save() 

@database_sync_to_async
def get_users():
	User = get_user_model()
	return list(User.objects.values('username'))

async def sendResponse(http, success, message, code):
	response_data = {
		'success': success,
		'message': message
	}
	return await http.send_response(code, json.dumps(response_data).encode(),
		headers=[(b"Content-Type", b"application/json")])

async def sendBadJWT(http):
	response_data = {
		'success': False,
		'is_jwt_valid': False,
		'message': 'Invalid JWT'
	}
	return await http.send_response(401, json.dumps(response_data).encode(),
		headers=[(b"Content-Type", b"application/json")])