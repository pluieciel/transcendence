#!/bin/sh

if [ ! -f /etc/nginx/nginx.key ] || [ ! -f /etc/nginx/nginx.crt ]; then
    openssl genrsa -out /etc/nginx/nginx.key 2048

    openssl req -new \
        -key /etc/nginx/nginx.key \
        -out /etc/nginx/nginx.csr \
        -subj "/C=LU/L=Belval/CN=localhost"

    openssl x509 -req -days 365 -in /etc/nginx/nginx.csr -signkey /etc/nginx/nginx.key -out /etc/nginx/nginx.crt
fi

exec /usr/sbin/nginx -g "daemon off;"
