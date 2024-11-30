#!/bin/sh

export ELASTICSEARCH_PASSWORD=$(cat $KIBANA_PASSWORD_FILE)

exec /usr/share/kibana/bin/kibana "$@"