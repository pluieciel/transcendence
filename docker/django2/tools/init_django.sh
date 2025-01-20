#!/bin/sh

export POSTGRES_PASSWORD=$(cat $POSTGRES_PASSWORD_FILE)
export DJANGO_SUPERUSER_PASSWORD=$(cat $DJANGO_SUPERUSER_PASSWORD_FILE)
export JWT_SECRET_KEY=$(cat $JWT_SECRET_KEY_FILE)


exec daphne -b 0.0.0.0 -p 8000 backend.asgi:application
#exec python manage.py runserver 0.0.0.0:8000 not working for chat and signup
