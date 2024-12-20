FROM alpine:3.21 AS build

RUN apk add --no-cache apache2-utils envsubst

FROM prom/prometheus:v3.0.0

WORKDIR /etc/prometheus

USER root

RUN mkdir -p ./config ./data && \
	chown -R nobody:nobody ./ && \
	rm ./prometheus.yml

COPY ./conf ./config

COPY ./tools/ /usr/local/bin
RUN chmod +x /usr/local/bin/init_prometheus.sh

COPY --from=build /usr/bin/htpasswd /usr/bin/envsubst /usr/bin/
COPY --from=build /usr/lib /usr/lib
COPY --from=build /lib /lib

USER nobody

EXPOSE 9090

ENTRYPOINT ["/usr/local/bin/init_prometheus.sh"]
