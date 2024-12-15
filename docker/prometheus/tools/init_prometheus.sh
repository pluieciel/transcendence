#!/bin/sh

export PROMETHEUS_PASSWORD=$(cat $PROMETHEUS_PASSWORD_FILE)

if [ ! -f /etc/prometheus/web-config.yml ]; then
    export PROMETHEUS_PASSWORD_HASH=$(htpasswd -nbBC 10 "" "$PROMETHEUS_PASSWORD" | tr -d ':')

    envsubst < /etc/prometheus/config/web-config.yml.template > /etc/prometheus/config/web-config.yml
fi

if [ ! -f /etc/prometheus/prometheus.yml ]; then
    envsubst < /etc/prometheus/config/prometheus.yml.template > /etc/prometheus/config/prometheus.yml
fi

if [ ! -f /etc/prometheus/config/certs/ca.key ] || [ ! -f /etc/prometheus/config/certs/ca.crt ]; then
    openssl genrsa -out /etc/prometheus/config/certs/ca.key 2048

    openssl req -x509 -new -nodes -key /etc/prometheus/config/certs/ca.key \
        -sha256 -days 365 -out /etc/prometheus/config/certs/ca.crt \
        -subj "/C=LU/L=Belval/O=42/CN=ca"
fi

if [ ! -f /etc/prometheus/config/certs/prometheus.key ] || [ ! -f /etc/prometheus/config/certs/prometheus.crt ]; then
    openssl genrsa -out /etc/prometheus/config/certs/prometheus.key 2048

    openssl req -new \
        -key /etc/prometheus/config/certs/prometheus.key \
        -out /etc/prometheus/config/certs/prometheus.csr \
        -subj "/C=LU/L=Belval/CN=prometheus"

    openssl x509 -req -in /etc/prometheus/config/certs/prometheus.csr \
        -CA /etc/prometheus/config/certs/ca.crt -CAkey /etc/prometheus/config/certs/ca.key -CAcreateserial \
        -out /etc/prometheus/config/certs/prometheus.crt -days 365 -sha256 -extensions v3_req -extfile /etc/prometheus/config/openssl.cnf
fi

if [ ! -f /etc/prometheus/config/certs/prometheus_metrics.key ] || [ ! -f /etc/prometheus/config/certs/prometheus_metrics.crt ]; then
    openssl genrsa -out /etc/prometheus/config/certs/prometheus_metrics.key 2048

    openssl req -new \
        -key /etc/prometheus/config/certs/prometheus_metrics.key \
        -out /etc/prometheus/config/certs/prometheus_metrics.csr \
        -subj "/C=LU/L=Belval/CN=prometheus_metrics"

    openssl x509 -req -in /etc/prometheus/config/certs/prometheus_metrics.csr \
        -CA /etc/prometheus/config/certs/ca.crt -CAkey /etc/prometheus/config/certs/ca.key -CAcreateserial \
        -out /etc/prometheus/config/certs/prometheus_metrics.crt -days 365 -sha256 -extensions v3_req -extfile /etc/prometheus/config/openssl.cnf
fi

exec /bin/prometheus \
    --web.config.file=/etc/prometheus/config/web-config.yml \
    --config.file=/etc/prometheus/config/prometheus.yml \
    --storage.tsdb.path=/etc/prometheus/data
