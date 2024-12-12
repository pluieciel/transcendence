#!/bin/sh

ELASTIC_PASSWORD=$(cat $ELASTICSEARCH_PASSWORD_FILE)

curl -s -f --cacert /usr/share/elasticsearch/config/elastic-certificates.pem \
    --resolve instance:9200:127.0.0.1 \
    -u "$ELASTIC_USERNAME:$ELASTIC_PASSWORD" \
    "https://localhost:$ELASTIC_PORT/_cluster/health?pretty" | grep status | grep -q '\(green\|yellow\)'
