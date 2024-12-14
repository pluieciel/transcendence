FROM alpine:3.21 AS build

RUN apk add --no-cache apache2-utils envsubst openssl

FROM prom/prometheus:v3.0.0

USER root

COPY ./conf /etc/prometheus

RUN mkdir -p /etc/prometheus/config/certs && \
    chown -R nobody:nobody /etc/prometheus/config

COPY ./tools/ /usr/local/bin
RUN chmod +x /usr/local/bin/init_prometheus.sh

COPY --from=build /etc/ssl/openssl.cnf /etc/ssl/openssl.cnf
COPY --from=build /usr/bin/htpasswd /usr/bin/envsubst /usr/bin/openssl /usr/bin/
COPY --from=build /usr/lib /usr/lib
COPY --from=build /lib /lib

USER nobody

EXPOSE 9090

ENTRYPOINT ["/usr/local/bin/init_prometheus.sh"]
