# Generated by Django 4.2.16 on 2025-01-14 16:40

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0010_gamehistory_tournament_count'),
    ]

    operations = [
        migrations.AddField(
            model_name='gamehistory',
            name='tournament_round2_game_id',
            field=models.IntegerField(default=-1),
        ),
        migrations.AddField(
            model_name='gamehistory',
            name='tournament_round2_place',
            field=models.IntegerField(default=-1),
        ),
    ]
