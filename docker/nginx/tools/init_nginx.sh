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

if [ ! -f /etc/nginx/certs/jwt.jwk ]; then
    JWT_SECRET=$(cat "$JWT_SECRET_KEY_FILE")
    JWT_SECRET_B64=$(echo -n "$JWT_SECRET" | base64 | tr -d '\n')

    cat > /etc/nginx/certs/jwt.jwk << EOF
{
    "keys": [
        {
            "k": "$JWT_SECRET_B64",
            "kty": "oct",
            "kid": "0001",
            "alg": "HS256"
        }
    ]
}
EOF
fi

exec /usr/sbin/nginx -g "daemon off;"
