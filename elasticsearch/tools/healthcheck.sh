#!/bin/sh

ELASTIC_PASSWORD=$(cat $ELASTICSEARCH_PASSWORD_FILE)

curl -s -f -u "$ELASTIC_USERNAME:$ELASTIC_PASSWORD" http://localhost:$ELASTIC_PORT/_cluster/health?pretty | grep status | grep -q '\(green\|yellow\)'
