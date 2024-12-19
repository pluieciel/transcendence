#!/bin/sh

ELASTIC_PASSWORD=$(cat $ELASTICSEARCH_PASSWORD_FILE)

curl -s -u "$ELASTIC_USERNAME:$ELASTIC_PASSWORD" \
    $ELASTIC_HOST/_cluster/health?pretty | grep status | grep -q '\(green\|yellow\)'
