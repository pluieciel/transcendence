#!/bin/sh

curl -s -f -u elastic:"$ELASTIC_PASSWORD" http://localhost:$ELASTIC_PORT/_cluster/health?pretty | grep status | grep -q '\(green\|yellow\)'
