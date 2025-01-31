#!/bin/sh

if [ ! -f /etc/vault/certs/vault.key ] || [ ! -f /etc/vault/certs/vault.crt ]; then
    echo "Generating TLS certificates for Vault..."

	openssl genrsa -out /etc/vault/certs/vault.key 2048

	openssl req -new \
		-key /etc/vault/certs/vault.key \
		-out /etc/vault/certs/vault.csr \
		-subj "/C=LU/L=Belval/CN=vault"

	openssl req -new -x509 -nodes \
		-days 365 \
		-keyout /etc/vault/certs/vault.key \
		-out /etc/vault/certs/vault.crt \
		-config /etc/vault/conf/openssl.conf

    echo "TLS certificates generated successfully"
fi