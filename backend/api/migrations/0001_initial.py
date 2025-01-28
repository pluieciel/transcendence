# Generated by Django 4.2.18 on 2025-01-28 12:51

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('auth', '0012_alter_user_first_name_max_length'),
    ]

    operations = [
        migrations.CreateModel(
            name='CustomUser',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('password', models.CharField(max_length=128, verbose_name='password')),
                ('last_login', models.DateTimeField(blank=True, null=True, verbose_name='last login')),
                ('is_superuser', models.BooleanField(default=False, help_text='Designates that this user has all permissions without explicitly assigning them.', verbose_name='superuser status')),
                ('username', models.CharField(max_length=16, unique=True)),
                ('oauthlog', models.BooleanField(default=False)),
                ('is_active', models.BooleanField(default=True)),
                ('is_admin', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('elo', models.IntegerField(default=1000)),
                ('wins', models.IntegerField(default=0)),
                ('looses', models.IntegerField(default=0)),
                ('language', models.CharField(default='en', max_length=4)),
                ('is_playing', models.BooleanField(default=False)),
                ('current_game_id', models.IntegerField(default=-1)),
                ('tourn_win', models.IntegerField(default=0)),
                ('tourn_joined', models.IntegerField(default=0)),
                ('theme', models.CharField(default='dark', max_length=5)),
                ('avatar', models.ImageField(blank=True, null=True, upload_to='avatars/')),
                ('avatar42', models.CharField(null=True)),
                ('totp_secret', models.CharField(max_length=64, null=True, unique=True)),
                ('is_2fa_enabled', models.BooleanField(default=False)),
                ('color', models.IntegerField(default=1)),
                ('quality', models.BooleanField(default=False)),
                ('display', models.CharField(max_length=30, null=True)),
                ('friends', models.ManyToManyField(blank=True, related_name='friend_set', to=settings.AUTH_USER_MODEL)),
                ('groups', models.ManyToManyField(blank=True, help_text='The groups this user belongs to. A user will get all permissions granted to each of their groups.', related_name='user_set', related_query_name='user', to='auth.group', verbose_name='groups')),
                ('invites', models.ManyToManyField(blank=True, related_name='invite_set', to=settings.AUTH_USER_MODEL)),
                ('user_permissions', models.ManyToManyField(blank=True, help_text='Specific permissions for this user.', related_name='user_set', related_query_name='user', to='auth.permission', verbose_name='user permissions')),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='RecoveryCode',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('recovery_code', models.CharField(max_length=8)),
                ('user', models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, related_name='user', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='GameInvite',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('recipient', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='invite_recipient', to=settings.AUTH_USER_MODEL)),
                ('sender', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='invite_sender', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='GameHistory',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('game_mode', models.CharField(max_length=32)),
                ('game_category', models.CharField(max_length=32)),
                ('game_state', models.CharField(default='waiting', max_length=32)),
                ('score_a', models.IntegerField(default=0)),
                ('score_b', models.IntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('tournament_count', models.IntegerField(default=0)),
                ('tournament_round2_game_id', models.IntegerField(default=-1)),
                ('tournament_round2_place', models.IntegerField(default=-1)),
                ('player_a', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='player_a', to=settings.AUTH_USER_MODEL)),
                ('player_b', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='player_b', to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]
