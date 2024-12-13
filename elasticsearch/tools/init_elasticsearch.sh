#!/bin/sh

export ELASTIC_PASSWORD=$(cat $ELASTICSEARCH_PASSWORD_FILE)

if [ ! -f ./config/elastic-certificates.p12 ]; then
    ./bin/elasticsearch-certutil ca --pass "$ELASTIC_PASSWORD" --out ./config/elastic-stack-ca.p12

    ./bin/elasticsearch-certutil cert \
        --ca ./config/elastic-stack-ca.p12 \
        --ca-pass "$ELASTIC_PASSWORD" \
        --pass "$ELASTIC_PASSWORD" \
        --out ./config/elastic-certificates.p12 \
        --dns elasticsearch

    ./bin/elasticsearch-keystore create

    ./bin/elasticsearch-keystore add -f xpack.security.transport.ssl.keystore.secure_password <<< "$ELASTIC_PASSWORD"
    ./bin/elasticsearch-keystore add -f xpack.security.transport.ssl.truststore.secure_password <<< "$ELASTIC_PASSWORD"

    ./bin/elasticsearch-keystore add -f xpack.security.http.ssl.keystore.secure_password <<< "$ELASTIC_PASSWORD"
    ./bin/elasticsearch-keystore add -f xpack.security.http.ssl.truststore.secure_password <<< "$ELASTIC_PASSWORD"

    mkdir -p ./config/certs
    openssl pkcs12 -in ./config/elastic-certificates.p12 \
        -out ./config/certs/elastic-certificates.pem \
        -nokeys \
        -passin pass:"$ELASTIC_PASSWORD"
fi

exec /bin/tini -- /usr/local/bin/docker-entrypoint.sh
