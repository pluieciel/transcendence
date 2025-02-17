# Generated by Django 4.2.18 on 2025-02-17 12:01

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
            name='User',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('password', models.CharField(max_length=128, verbose_name='password')),
                ('last_login', models.DateTimeField(blank=True, null=True, verbose_name='last login')),
                ('is_superuser', models.BooleanField(default=False, help_text='Designates that this user has all permissions without explicitly assigning them.', verbose_name='superuser status')),
                ('username', models.CharField(max_length=16, unique=True)),
                ('display_name', models.CharField(max_length=16, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('is_admin', models.BooleanField(default=False)),
                ('is_42_user', models.BooleanField(default=False)),
                ('is_42_avatar_used', models.BooleanField(default=False)),
                ('is_2fa_enabled', models.BooleanField(default=False)),
                ('avatar', models.ImageField(blank=True, null=True, upload_to='avatars/')),
                ('avatar_42', models.CharField(null=True)),
                ('totp_secret', models.CharField(max_length=32, null=True, unique=True)),
                ('recovery_codes_generated', models.BooleanField(default=False)),
                ('is_playing', models.BooleanField(default=False)),
                ('current_game_id', models.IntegerField(default=-1)),
                ('tournament_win', models.IntegerField(default=0)),
                ('tournament_participated', models.IntegerField(default=0)),
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
            name='Achievement',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100, unique=True)),
                ('description', models.TextField()),
                ('color_unlocked', models.IntegerField(null=True)),
                ('unlock_value', models.IntegerField(default=1)),
            ],
        ),
        migrations.CreateModel(
            name='UserStatistic',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('classic_elo', models.IntegerField(default=1000)),
                ('classic_wins', models.IntegerField(default=0)),
                ('classic_losses', models.IntegerField(default=0)),
                ('rumble_elo', models.IntegerField(default=1000)),
                ('rumble_wins', models.IntegerField(default=0)),
                ('rumble_losses', models.IntegerField(default=0)),
                ('tournament_top_1', models.IntegerField(default=0)),
                ('tournament_losses', models.IntegerField(default=0)),
                ('tournament_top_2', models.IntegerField(default=0)),
                ('tournament_current_streak', models.IntegerField(default=0)),
                ('tournament_max_streak', models.IntegerField(default=0)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='statistic', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='UserPreference',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('color', models.IntegerField(default=1)),
                ('quality', models.IntegerField(default=2)),
                ('game_mode', models.CharField(default='classic', max_length=16)),
                ('game_type', models.CharField(default='ai', max_length=16)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='preference', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='RecoveryCode',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('recovery_code', models.CharField(max_length=128)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, related_name='recovery_codes', to=settings.AUTH_USER_MODEL)),
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
                ('game_mode', models.CharField(default='classic', max_length=32)),
                ('game_type', models.CharField(max_length=32)),
                ('game_state', models.CharField(default='waiting', max_length=32)),
                ('elo_change', models.IntegerField(default=0)),
                ('score_left', models.IntegerField(default=0)),
                ('score_right', models.IntegerField(default=0)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('tournament_count', models.IntegerField(default=0)),
                ('tournament_round2_game_id', models.IntegerField(default=-1)),
                ('tournament_round2_place', models.IntegerField(default=-1)),
                ('player_left', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='player_left', to=settings.AUTH_USER_MODEL)),
                ('player_right', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='player_right', to=settings.AUTH_USER_MODEL)),
                ('winner', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='winner', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='UserAchievement',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date_earned', models.DateTimeField(auto_now_add=True)),
                ('unlocked', models.BooleanField(default=False)),
                ('progression', models.IntegerField(default=0)),
                ('achievement', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='api.achievement')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='user_achievements', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'unique_together': {('user', 'achievement')},
            },
        ),
    ]
