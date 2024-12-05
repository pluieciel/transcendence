- cd django
- clear && python3 manage.py collectstatic --noinput && daphne transcendence.asgi:application -b 0.0.0.0 -p 8000

Backend (server side) is located in django/Game
Frontend (rendering) is located in django/frontend
