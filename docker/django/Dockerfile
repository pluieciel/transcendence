FROM python:3.13.0-alpine3.19

RUN apk add --no-cache \
	musl-dev \
	postgresql-dev \
	libpq

WORKDIR /usr/src/app

COPY ./tools/requirements.txt .

RUN apk add curl
RUN python -m pip install -r requirements.txt

COPY ./tools/start_django.sh /usr/local/bin/start_django.sh
RUN chmod +x /usr/local/bin/start_django.sh

EXPOSE 8000

ENTRYPOINT ["/usr/local/bin/start_django.sh"]
