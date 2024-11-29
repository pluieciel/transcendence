#!/bin/sh

ELASTIC_PASSWORD=$(cat $ELASTIC_PASSWORD_FILE)

curl -s -f -u elastic:"$ELASTIC_PASSWORD" http://localhost:9200/_cluster/health?pretty | grep status | grep -q '\(green\|yellow\)'