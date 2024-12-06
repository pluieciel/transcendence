#!/bin/sh

export ELASTIC_PASSWORD=$(cat $ELASTICSEARCH_PASSWORD_FILE)

exec /bin/tini -- /usr/local/bin/docker-entrypoint.sh
