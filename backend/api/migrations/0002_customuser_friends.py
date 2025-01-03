# Generated by Django 4.2.16 on 2024-12-31 10:23

from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='customuser',
            name='friends',
            field=models.ManyToManyField(blank=True, related_name='friend_set', to=settings.AUTH_USER_MODEL),
        ),
    ]
