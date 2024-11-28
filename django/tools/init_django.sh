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

    cat <<EOF >> ./transcendence/settings.py

import os
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

CSRF_TRUSTED_ORIGINS = ['http://localhost:8081']

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "%(asctime)s %(levelname)s %(name)s [%(process)d]: %(message)s"
        },
        "simple": {
            "format": "%(asctime)s %(levelname)s %(message)s"
        },
    },
    "handlers": {
        "file": {
            "level": "DEBUG",
            "class": "logging.FileHandler",
            "filename": "/var/log/django/django.log",
            "formatter": "verbose",
        },
    },
    "loggers": {
        "django": {
            "handlers": ["file"],
            "level": "DEBUG",
            "propagate": True,
        },
        "django.db.backends": {
            "handlers": ["file"],
            "level": "DEBUG",
            "propagate": False,
        },
    },
}
EOF

    python manage.py makemigrations
    python manage.py migrate
    python manage.py collectstatic --noinput

    if ! python manage.py shell -c "from django.contrib.auth import get_user_model; User = get_user_model(); User.objects.filter(username='$DJANGO_SUPERUSER_USERNAME').exists()" | grep -q 'True'; then
        python manage.py createsuperuser --noinput --username $DJANGO_SUPERUSER_USERNAME --email $DJANGO_SUPERUSER_EMAIL
    else
        echo "Superuser $DJANGO_SUPERUSER_USERNAME already exists."
    fi
fi

exec daphne -b 0.0.0.0 -p $DJANGO_PORT transcendence.asgi:application
