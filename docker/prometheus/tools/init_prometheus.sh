#!/bin/sh

if [ ! -f /etc/prometheus/web-config.yml ]; then
    PROMETHEUS_PASSWORD=$(cat $PROMETHEUS_PASSWORD_FILE)

    export PROMETHEUS_PASSWORD_HASH=$(htpasswd -nbBC 10 "" "$PROMETHEUS_PASSWORD" | tr -d ':\n')

    envsubst < /etc/prometheus/config/web-config.yml.template > /etc/prometheus/config/web-config.yml
fi

if [ ! -f /etc/prometheus/config/certs/prometheus.key ] || [ ! -f /etc/prometheus/config/certs/prometheus.crt ]; then
    openssl genrsa -out /etc/prometheus/config/certs/prometheus.key 2048

    openssl req -new \
        -key /etc/prometheus/config/certs/prometheus.key \
        -out /etc/prometheus/config/certs/prometheus.csr \
        -subj "/C=LU/L=Belval/CN=localhost"

    openssl x509 -req -days 365 -in /etc/prometheus/config/certs/prometheus.csr -signkey /etc/prometheus/config/certs/prometheus.key -out /etc/prometheus/config/certs/prometheus.crt
fi

exec /bin/prometheus \
    --web.config.file=/etc/prometheus/config/web-config.yml \
    --config.file=/etc/prometheus/config/prometheus.yml \
    --storage.tsdb.path=/etc/prometheus/data