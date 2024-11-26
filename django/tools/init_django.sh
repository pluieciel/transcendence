#!/bin/sh

export POSTGRES_PASSWORD=$(cat $POSTGRES_PASSWORD_FILE)
export DJANGO_SUPERUSER_PASSWORD=$(cat $DJANGO_SUPERUSER_PASSWORD_FILE)

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

    sed -i "\$a\\
STATIC_URL = '/static/'\\
STATICFILES_DIRS = ['/usr/src/app/frontend']
" ./transcendence/settings.py

    python ./manage.py createsuperuser --noinput --username $DJANGO_SUPERUSER_USERNAME --email $DJANGO_SUPERUSER_EMAIL
	python ./manage.py makemigrations
	python ./manage.py migrate
fi

exec python ./manage.py runserver 0.0.0.0:$DJANGO_PORT
