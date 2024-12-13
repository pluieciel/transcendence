#!/bin/sh

export POSTGRES_PASSWORD=$(cat $POSTGRES_PASSWORD_FILE)
export DJANGO_SUPERUSER_PASSWORD=$(cat $DJANGO_SUPERUSER_PASSWORD_FILE)

python manage.py makemigrations
python manage.py migrate
python manage.py collectstatic --noinput

if ! python manage.py shell -c "from django.contrib.auth import get_user_model; User = get_user_model(); User.objects.filter(username='$DJANGO_SUPERUSER_USERNAME').exists()" | grep -q 'True'; then
        python manage.py createsuperuser --noinput --username $DJANGO_SUPERUSER_USERNAME --email $DJANGO_SUPERUSER_EMAIL
else
    echo "Superuser $DJANGO_SUPERUSER_USERNAME already exists."
fi

exec daphne -b 0.0.0.0 -p 8000 backend.asgi:application
#exec python manage.py runserver 0.0.0.0:8000 not working for chat and signup
