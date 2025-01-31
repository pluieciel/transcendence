FROM alpine:3.21

WORKDIR /etc/vault/certs/

RUN apk add --no-cache \
    openssl

RUN mkdir -p /etc/vault/certs/

COPY ./conf/ /etc/vault/conf/

COPY ./tools/ /usr/local/bin/
RUN chmod +x /usr/local/bin/init_vault.sh

ENTRYPOINT ["/usr/local/bin/init_vault.sh"]