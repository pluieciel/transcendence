# models.py
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone
from datetime import timedelta
from channels.db import database_sync_to_async

######################## USER ###########################

class CustomUserManager(BaseUserManager):
    def create_user(self, username, password=None, avatar=None):
        if not username:
            raise ValueError('Users must have a username')

        user = self.model(username=username, avatar=avatar)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def	create_user_oauth(self, username, avatarUrl):
        if not username:
            raise ValueError('Users must have a username')
        user = self.model(username=username, oauthlog=True, avatar42=avatarUrl)
        user.save(using=self._db)
        return user

    def create_superuser(self, username, password=None):
        user = self.create_user(
            username=username,
            password=password,
        )
        user.is_admin = True
        user.save(using=self._db)
        return user

class CustomUser(AbstractBaseUser, PermissionsMixin):
    username = models.CharField(max_length=16, unique=True)
    oauthlog = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    is_admin = models.BooleanField(default=False)
    is_connected = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    elo = models.IntegerField(default=1000)
    wins = models.IntegerField(default=0)
    looses = models.IntegerField(default=0)
    language = models.CharField(max_length=4, unique=False, default="en")
    is_playing = models.BooleanField(default=False)
    current_game_id = models.IntegerField(default=-1)
    tourn_win = models.IntegerField(default=0)
    tourn_joined = models.IntegerField(default=0)
    theme = models.CharField(default="dark", max_length=5)
    friends = models.ManyToManyField('self', symmetrical=False, related_name='friend_set', blank=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    avatar42 = models.CharField(null=True)
    totp_secret = models.CharField(max_length=32, unique=True, null=True)
    is_2fa_enabled = models.BooleanField(default=False)
    recovery_codes_generated = models.BooleanField(default=False)
    invites = models.ManyToManyField('self', symmetrical=False, related_name='invite_set', blank=True)
    color = models.IntegerField(default=1)
    quality = models.IntegerField(default=1)
    display = models.CharField(max_length=30, null=True)

    objects = CustomUserManager()

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = []

    def __str__(self):
        return self.username

    def has_perm(self, perm, obj=None):
        return True

    def has_module_perms(self, app_label):
        return True


######################## GAME INVITE ###########################

class GameInvite(models.Model):
    sender = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='invite_sender')
    recipient = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='invite_recipient')
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
    game_mode = models.CharField(max_length=32)
    game_category = models.CharField(max_length=32) # Quick Match, Invite, Tournament1/2?
    game_state = models.CharField(max_length=32, default='waiting') # waiting, playing, finished
    score_a = models.IntegerField(default=0)
    score_b = models.IntegerField(default=0)
    player_a = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, related_name='player_a')
    player_b = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, related_name='player_b')
    created_at = models.DateTimeField(auto_now_add=True)
    tournament_count = models.IntegerField(default=0)
    tournament_round2_game_id = models.IntegerField(default=-1)
    tournament_round2_place = models.IntegerField(default=-1)

class RecoveryCode(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, null=True, related_name='user')
    recovery_code = models.CharField(max_length=128)
    created_at = models.DateTimeField(auto_now_add=True)
