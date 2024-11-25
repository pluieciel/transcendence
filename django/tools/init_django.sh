#!/bin/sh

POSTGRESQL_PASSWORD=$(cat $POSTGRESQL_PASSWORD_FILE)
sed -i "s/^ALLOWED_HOSTS = .*/ALLOWED_HOSTS = ['*']/" /transcendence/transcendence/settings.py

sed -i "/DATABASES = {/,+5c\\
DATABASES = {\\
    \"default\": {\\
        \"ENGINE\": \"django.db.backends.postgresql\",\\
        \"NAME\": \"$POSTGRESQL_DATABASE\",\\
        \"USER\": \"$POSTGRESQL_USER\",\\
        \"PASSWORD\": \"$POSTGRESQL_PASSWORD\",\\
        \"HOST\": \"127.0.0.1\",\\
        \"PORT\": \"5432\",\\
    }\\
}" /transcendence/transcendence/settings.py

python /transcendence/manage.py runserver 0.0.0.0:8080
