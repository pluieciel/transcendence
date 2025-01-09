# Generated by Django 4.2.16 on 2025-01-08 13:35

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0006_gameinvite'),
    ]

    operations = [
        migrations.CreateModel(
            name='GameHistory',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('is_finished', models.BooleanField(default=False)),
                ('game_mode', models.CharField(max_length=32)),
                ('game_category', models.CharField(max_length=32)),
                ('score_a', models.IntegerField(default=0)),
                ('score_b', models.IntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('player_a', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='player_a', to=settings.AUTH_USER_MODEL)),
                ('player_b', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='player_b', to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]
