#!/bin/sh

export POSTGRES_PASSWORD=$(cat $POSTGRES_PASSWORD_FILE)

python manage.py makemigrations
python manage.py migrate

exec daphne -b 0.0.0.0 -p 8000 backend.asgi:application
