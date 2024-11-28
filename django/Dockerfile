FROM python:3.13.0-alpine3.19

RUN apk add --no-cache \
	musl-dev \
	postgresql-dev \
	libpq \
	npm \
	nodejs

WORKDIR /usr/src/app

COPY ./tools/requirements.txt .
COPY ./tools/frontend ./frontend

RUN python -m pip install -r requirements.txt

RUN npm init -y
RUN npm install three

COPY ./tools/init_django.sh /usr/local/bin/init_django.sh
RUN chmod +x /usr/local/bin/init_django.sh

RUN mkdir -p /var/log/django

EXPOSE 8080

ENTRYPOINT ["/usr/local/bin/init_django.sh"]
