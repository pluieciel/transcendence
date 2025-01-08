# models.py
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone
from datetime import timedelta
from channels.db import database_sync_to_async

class CustomUserManager(BaseUserManager):
    def create_user(self, username, password=None, avatar=None):
        if not username:
            raise ValueError('Users must have a username')

        user = self.model(username=username, avatar=avatar)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def	create_user_oauth(self, username, token):
        if not username:
            raise ValueError('Users must have a username')
        user = self.model(username=username, oauthlog=True)
        user.save(using=self._db)
        return user


    def create_superuser(self, username, password=None):
        user = self.create_user(
            username=username,
            password=password,
        )
        user.is_admin = True
        user.is_staff = True
        user.is_superuser = True
        user.save(using=self._db)
        return user

class CustomUser(AbstractBaseUser, PermissionsMixin):
    username = models.CharField(max_length=30, unique=True)
    oauthlog = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_admin = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    elo = models.IntegerField(default=1000)
    wins = models.IntegerField(default=0)
    looses = models.IntegerField(default=0)
    language = models.CharField(max_length=4, unique=False, default="en")
    is_playing = models.BooleanField(default=False)
    is_bot = models.BooleanField(default=False)
    current_game_id = models.IntegerField(default=0)
    tourn_win = models.IntegerField(default=0)
    tourn_joined = models.IntegerField(default=0)
    friends = models.ManyToManyField('self', symmetrical=False, related_name='friend_set', blank=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    nickname = models.CharField(max_length=30, null=True)
    invites = models.ManyToManyField('self', symmetrical=False, related_name='invite_set', blank=True)

    objects = CustomUserManager()

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = []

    def __str__(self):
        return self.username

    def has_perm(self, perm, obj=None):
        return True

    def has_module_perms(self, app_label):
        return True

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
        GameInvite.objects.filter(sender=sender, recipient=recipient).delete()
        return True
    else:
        return False

class GameHistory(models.Model):
    game_mode = models.CharField(max_length=32)
    game_category = models.CharField(max_length=32)
    game_state = models.CharField(max_length=32, default='waiting') # waiting, playing, finished
    score_a = models.IntegerField(default=0)
    score_b = models.IntegerField(default=0)
    player_a = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, related_name='player_a')
    player_b = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, related_name='player_b')
    created_at = models.DateTimeField(auto_now_add=True)
