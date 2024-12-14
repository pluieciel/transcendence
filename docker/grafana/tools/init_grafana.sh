#!/bin/sh

openssl genrsa -out ./conf/certs/grafana.key 2048

openssl req -new \
    -key ./conf/certs/grafana.key \
    -out ./conf/certs/grafana.csr \
    -subj "/C=LU/L=Belval/CN=localhost"

openssl x509 -req -days 365 -in ./conf/certs/grafana.csr -signkey ./conf/certs/grafana.key -out ./conf/certs/grafana.crt

chown grafana:root ./conf/certs/grafana.crt ./conf/certs/grafana.key
chmod 400 ./conf/certs/grafana.key ./conf/certs/grafana.crt

exec /run.sh