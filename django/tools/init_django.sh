#!/bin/sh

sed -i "s/^ALLOWED_HOSTS = .*/ALLOWED_HOSTS = ['*']/" /transcendence/transcendence/settings.py

python /transcendence/manage.py runserver 0.0.0.0:8080
