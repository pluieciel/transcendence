# models.py
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models

class CustomUserManager(BaseUserManager):
    def create_user(self, username, password=None):
        if not username:
            raise ValueError('Users must have a username')

        user = self.model(username=username)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def	create_user_oauth(self, username):
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
    current_game_id = models.IntegerField(default=0)
    tourn_win = models.IntegerField(default=0)
    tourn_joined = models.IntegerField(default=0)

    objects = CustomUserManager()

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = []

    def __str__(self):
        return self.username

    def has_perm(self, perm, obj=None):
        return True

    def has_module_perms(self, app_label):
        return True
