FROM python:3.14.0a2-alpine3.19

RUN python -m pip install Django

RUN django-admin startproject transcendence

EXPOSE 8000

CMD ["python", "./transcendence/manage.py", "runserver", "0.0.0.0:8000"]
