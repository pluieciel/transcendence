#!/bin/sh

export ELASTIC_PASSWORD=$(cat $ELASTIC_PASSWORD_FILE)

exec /usr/share/logstash/bin/logstash "$@"