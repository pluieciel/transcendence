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

    sed -i 's|STATIC_URL = .*$|STATIC_URL = "/static/"|' ./transcendence/settings.py

    # Add STATIC_ROOT setting
    echo "import os" >> ./transcendence/settings.py
    echo "STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')" >> ./transcendence/settings.py

    python manage.py makemigrations
    python manage.py migrate
    python manage.py collectstatic --noinput

    # Check if superuser already exists
    if ! python manage.py shell -c "from django.contrib.auth import get_user_model; User = get_user_model(); User.objects.filter(username='$DJANGO_SUPERUSER_USERNAME').exists()" | grep -q 'True'; then
        python manage.py createsuperuser --noinput --username $DJANGO_SUPERUSER_USERNAME --email $DJANGO_SUPERUSER_EMAIL
    else
        echo "Superuser $DJANGO_SUPERUSER_USERNAME already exists."
    fi
fi

exec gunicorn transcendence.wsgi:application --bind 0.0.0.0:$DJANGO_PORT
