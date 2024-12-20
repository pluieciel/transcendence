#!/bin/sh

export ELASTIC_PASSWORD=$(cat $ELASTICSEARCH_PASSWORD_FILE)

exec /usr/share/logstash/bin/logstash "$@"
