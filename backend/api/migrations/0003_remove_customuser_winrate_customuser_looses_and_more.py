# Generated by Django 5.1.4 on 2024-12-13 09:24

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0002_customuser_elo_customuser_winrate'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='customuser',
            name='winrate',
        ),
        migrations.AddField(
            model_name='customuser',
            name='looses',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='customuser',
            name='wins',
            field=models.IntegerField(default=0),
        ),
    ]
