#!/bin/sh

POSTGRES_PASSWORD=$(cat $POSTGRES_PASSWORD_FILE)

sed -i "s/^ALLOWED_HOSTS = .*/ALLOWED_HOSTS = ['*']/" /transcendence/transcendence/settings.py

sed -i "/DATABASES = {/,+5c\\
DATABASES = {\\
    \"default\": {\\
        \"ENGINE\": \"django.db.backends.postgresql\",\\
        \"NAME\": \"$POSTGRES_DB\",\\
        \"USER\": \"$POSTGRES_USER\",\\
        \"PASSWORD\": \"$POSTGRES_PASSWORD\",\\
        \"HOST\": \"$POSTGRES_HOST\",\\
        \"PORT\": \"$POSTGRES_PORT\",\\
    }\\
}" /transcendence/transcendence/settings.py

python /transcendence/manage.py runserver 0.0.0.0:$DJANGO_PORT
