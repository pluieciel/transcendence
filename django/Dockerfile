FROM python:3.14.0a2-alpine3.19

RUN python -m pip install Django

RUN django-admin startproject transcendence

COPY ./tools/init_django.sh /usr/local/bin/init_django.sh

RUN chmod +x /usr/local/bin/init_django.sh

WORKDIR /transcendence

EXPOSE 8080

ENTRYPOINT ["/usr/local/bin/init_django.sh"]
