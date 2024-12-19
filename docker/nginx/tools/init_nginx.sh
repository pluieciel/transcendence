#!/bin/sh

if [ ! -f /etc/nginx/certs/nginx.key ] || [ ! -f /etc/nginx/certs/nginx.crt ]; then
    openssl genrsa -out /etc/nginx/certs/nginx.key 2048

    openssl req -new \
        -key /etc/nginx/certs/nginx.key \
        -out /etc/nginx/certs/nginx.csr \
        -subj "/C=LU/L=Belval/CN=nginx"

    openssl req -new -x509 -nodes \
        -days 365 \
        -keyout /etc/nginx/certs/nginx.key \
        -out /etc/nginx/certs/nginx.crt \
        -config /etc/nginx/openssl.conf
fi

exec /usr/sbin/nginx -g "daemon off;"
