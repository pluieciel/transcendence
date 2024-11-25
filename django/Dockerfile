FROM python:3.14.0a2-alpine3.19

RUN python -m pip install Django

RUN django-admin startproject transcendence

COPY ./init_django.sh /init_django.sh

RUN chmod +x /init_django.sh

WORKDIR /transcendence

EXPOSE 8080

ENTRYPOINT ["/init_django.sh"]
