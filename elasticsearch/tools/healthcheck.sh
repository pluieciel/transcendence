#!/bin/sh

ELASTIC_PASSWORD=$(cat $ELASTICSEARCH_PASSWORD_FILE)

curl -s -u "$ELASTIC_USERNAME:$ELASTIC_PASSWORD" \
	--cacert config/elastic-certificates.pem \
    --resolve instance:$ELASTIC_PORT:127.0.0.1 \
    https://instance:$ELASTIC_PORT/_cluster/health?pretty | grep status | grep -q '\(green\|yellow\)'
