# models.py
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone
from datetime import timedelta
from channels.db import database_sync_to_async

######################## USER ###########################

class UserManager(BaseUserManager):
    def _create_default_achievements(self, user):
        achievements = Achievement.objects.all()
        for achievement in achievements:
             UserAchievement.objects.get_or_create(
                 user=user,
                 achievement=achievement,
                 defaults={
                     'unlocked': False,
                     'progression': 0,
                     'date_earned': "2025-01-01T00:00:00Z"
                 }
             )

    def create_user(self, username, password=None, avatar=None):
        if not username:
            raise ValueError('Users must have a username')

        user = self.model(username=username, avatar=avatar)
        user.set_password(password)
        user.save(using=self._db)
        UserPreference.objects.create(user=user)
        UserStatistic.objects.create(user=user)
        self._create_default_achievements(user)
        return user

    def	create_user_oauth(self, username, avatarUrl):
        if not username:
            raise ValueError('Users must have a username')
        user = self.model(username=username, is_42_user=True, avatar_42=avatarUrl, is_42_avatar_used=True)
        user.save(using=self._db)
        UserPreference.objects.create(user=user)
        UserStatistic.objects.create(user=user)
        self._create_default_achievements(user)
        return user

    def create_superuser(self, username, password=None):
        user = self.create_user(
            username=username,
            password=password,
        )
        user.is_admin = True
        user.save(using=self._db)
        return user

class User(AbstractBaseUser, PermissionsMixin):
    username = models.CharField(max_length=16, unique=True)
    display_name = models.CharField(max_length=16, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_admin = models.BooleanField(default=False)
    is_42_user = models.BooleanField(default=False)
    is_42_avatar_used = models.BooleanField(default=False)
    is_2fa_enabled = models.BooleanField(default=False)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    avatar_42 = models.CharField(null=True)
    totp_secret = models.CharField(max_length=32, unique=True, null=True)
    recovery_codes_generated = models.BooleanField(default=False)
    playing = models.BooleanField(default = False)
    tournament = models.BooleanField(default = False)
    current_game_id = models.IntegerField(default=-1)
    friends = models.ManyToManyField('self', symmetrical=False, related_name='friend_set', blank=True)
    invites = models.ManyToManyField('self', symmetrical=False, related_name='invite_set', blank=True)

    objects = UserManager()

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = []

    def __str__(self):
        return self.username

    def has_perm(self, perm, obj=None):
        return True

    def has_module_perms(self, app_label):
        return True

    def unlock_achievement(self, achievement_name):
        achievement = Achievement.objects.get(name=achievement_name)
        UserAchievement.objects.create(user=self, achievement=achievement)

    def get_achievements(self):
        return self.user_achievements


class UserPreference(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='preference')
    color = models.IntegerField(default=1)
    quality = models.IntegerField(default=2)
    game_mode = models.CharField(max_length=16, default='classic')
    game_type = models.CharField(max_length=16, default='ai')

class UserStatistic(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='statistic')
    classic_total_played = models.IntegerField(default=0)
    classic_elo = models.IntegerField(default=1000)
    classic_wins = models.IntegerField(default=0)
    rumble_total_played = models.IntegerField(default=0)
    rumble_elo = models.IntegerField(default=1000)
    rumble_wins = models.IntegerField(default=0)
    tournament_total_participated = models.IntegerField(default=0)
    tournament_top_1 = models.IntegerField(default=0)
    tournament_top_2 = models.IntegerField(default=0)
    tournament_current_streak = models.IntegerField(default=0)
    tournament_max_streak = models.IntegerField(default=0)

######################## GAME INVITE ###########################

class GameInvite(models.Model):
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='invite_sender')
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='invite_recipient')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.sender.username} invited {self.recipient.username}"

def cleanup_invites():
    GameInvite.objects.filter(created_at__lt=timezone.now() - timedelta(minutes=5)).delete()

@database_sync_to_async
def register_invite(sender, recipient):
    cleanup_invites()
    GameInvite.objects.create(sender=sender, recipient=recipient)

@database_sync_to_async
def is_valid_invite(sender, recipient):
    cleanup_invites()
    if GameInvite.objects.filter(sender=sender, recipient=recipient).exists():
        return True
    else:
        return False


##################### GAME HISTORY ###########################

class GameHistory(models.Model):
    game_mode = models.CharField(max_length=32, default='classic')
    game_type = models.CharField(max_length=32)
    game_state = models.CharField(max_length=32, default='waiting')
    elo_change = models.IntegerField(default=0)
    score_left = models.IntegerField(default=0)
    score_right = models.IntegerField(default=0)
    player_left = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='player_left')
    player_right = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='player_right')
    winner = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='winner')
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    tournament_count = models.IntegerField(default=0)
    tournament_round2_game_id = models.IntegerField(default=-1)
    tournament_round2_place = models.IntegerField(default=-1)

class RecoveryCode(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, related_name='recovery_codes')
    recovery_code = models.CharField(max_length=128)
    created_at = models.DateTimeField(auto_now_add=True)


class Achievement(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField()
    color_unlocked = models.IntegerField(null=True)
    unlock_value = models.IntegerField(default=1)
    category = models.CharField(default='classic')
    icon = models.CharField(max_length=64)
    order = models.IntegerField(unique=True)

    def __str__(self):
        return self.name

class UserAchievement(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='user_achievements')
    achievement = models.ForeignKey(Achievement, on_delete=models.CASCADE)
    date_earned = models.DateTimeField(auto_now_add=True)
    unlocked = models.BooleanField(default=False)
    progression = models.IntegerField(default=0)

    class Meta:
        unique_together = ('user', 'achievement')

    def __str__(self):
        return f"{self.user.username} - {self.achievement.name}"