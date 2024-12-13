#!/bin/sh

if [ ! -f ./config/elastic-certificates.p12 ]; then
    export ELASTIC_PASSWORD=$(cat $ELASTICSEARCH_PASSWORD_FILE)

    ./bin/elasticsearch-certutil ca --pass "$ELASTIC_PASSWORD" --out ./config/elastic-stack-ca.p12

    ./bin/elasticsearch-certutil cert \
        --ca ./config/elastic-stack-ca.p12 \
        --ca-pass "$ELASTIC_PASSWORD" \
        --pass "$ELASTIC_PASSWORD" \
        --out ./config/elastic-certificates.p12 \
        --dns elasticsearch

    ./bin/elasticsearch-certutil cert \
        --ca ./config/elastic-stack-ca.p12 \
        --ca-pass "$ELASTIC_PASSWORD" \
        --pass "$ELASTIC_PASSWORD" \
        --out ./config/kibana-certificates.p12 \
        --dns kibana

    ./bin/elasticsearch-keystore create

    ./bin/elasticsearch-keystore add -f xpack.security.transport.ssl.keystore.secure_password <<< "$ELASTIC_PASSWORD"
    ./bin/elasticsearch-keystore add -f xpack.security.transport.ssl.truststore.secure_password <<< "$ELASTIC_PASSWORD"

    ./bin/elasticsearch-keystore add -f xpack.security.http.ssl.keystore.secure_password <<< "$ELASTIC_PASSWORD"
    ./bin/elasticsearch-keystore add -f xpack.security.http.ssl.truststore.secure_password <<< "$ELASTIC_PASSWORD"

    openssl pkcs12 -in ./config/elastic-certificates.p12 \
        -out ./config/certs/elastic-certificates.pem \
        -nokeys \
        -passin pass:"$ELASTIC_PASSWORD"

    openssl pkcs12 -in ./config/kibana-certificates.p12 \
        -out ./config/certs/kibana-certificates.pem \
        -nokeys \
        -passin pass:"$ELASTIC_PASSWORD"

    openssl pkcs12 -in ./config/kibana-certificates.p12 \
        -out ./config/certs/kibana-key.pem \
        -nocerts \
        -nodes \
        -passin pass:"$ELASTIC_PASSWORD"

    chmod 644 ./config/certs/*.pem
    chmod 600 ./config/certs/kibana-key.pem
fi

exec /bin/tini -- /usr/local/bin/docker-entrypoint.sh
