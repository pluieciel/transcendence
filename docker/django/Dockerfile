FROM python:3.13.0-alpine3.19

RUN apk add --no-cache \
	musl-dev \
	postgresql-dev \
	libpq

WORKDIR /usr/src/app

COPY ./tools/requirements.txt .

RUN python -m pip install -r requirements.txt

COPY ./tools/init_django.sh /usr/local/bin/init_django.sh
RUN chmod +x /usr/local/bin/init_django.sh

EXPOSE 8000

ENTRYPOINT ["/usr/local/bin/init_django.sh"]
