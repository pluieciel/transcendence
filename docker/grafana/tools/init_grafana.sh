#!/bin/sh

export PROMETHEUS_PASSWORD=$(cat $PROMETHEUS_PASSWORD_FILE)

if [ ! -f /etc/grafana/provisioning/datasources/datasources.yml ]; then
    envsubst < /etc/grafana/provisioning/datasources/datasources.yml.template > /etc/grafana/provisioning/datasources/datasources.yml
fi

exec /run.sh