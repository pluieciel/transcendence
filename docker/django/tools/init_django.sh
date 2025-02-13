#!/bin/sh

export POSTGRES_PASSWORD=$(cat $POSTGRES_PASSWORD_FILE)
INIT_FLAG="/.db_initialized"

python manage.py makemigrations
python manage.py migrate

if [ ! -f "$INIT_FLAG" ]; then
	python manage.py loaddata db_init
	rm -rf ./avatars/*
	touch "$INIT_FLAG"
fi

exec daphne -b 0.0.0.0 -p 8000 backend.asgi:application
