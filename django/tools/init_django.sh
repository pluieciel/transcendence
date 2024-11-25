#!/bin/sh

POSTGRES_PASSWORD=$(cat $POSTGRES_PASSWORD_FILE)

if [ ! -f manage.py ]; then
    django-admin startproject transcendence .

    sed -i "s/^ALLOWED_HOSTS = .*/ALLOWED_HOSTS = ['*']/" ./transcendence/settings.py

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
}" ./transcendence/settings.py
fi

exec python ./manage.py runserver 0.0.0.0:$DJANGO_PORT
