#!/bin/sh

export PROMETHEUS_PASSWORD=$(cat $PROMETHEUS_PASSWORD_FILE)
export PROMETHEUS_PASSWORD_HASH=$(htpasswd -nbBC 10 "" "$PROMETHEUS_PASSWORD" | tr -d ':')

if [ ! -f /etc/prometheus/web-config.yml ]; then
    envsubst < /etc/prometheus/config/web-config.yml.template > /etc/prometheus/config/web-config.yml
fi

if [ ! -f /etc/prometheus/prometheus.yml ]; then
    envsubst < /etc/prometheus/config/prometheus.yml.template > /etc/prometheus/config/prometheus.yml
fi

exec /bin/prometheus \
    --web.config.file=/etc/prometheus/config/web-config.yml \
    --config.file=/etc/prometheus/config/prometheus.yml \
    --web.external-url=/admin/services/prometheus/ \
    --web.route-prefix=/admin/services/prometheus/ \
    --storage.tsdb.path=/etc/prometheus/data \
    --storage.tsdb.retention.time=90d
