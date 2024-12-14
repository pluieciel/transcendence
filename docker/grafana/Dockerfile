FROM grafana/grafana:11.4.0

USER root

RUN apk update && \
	apk upgrade && \
	apk add --no-cache \
	openssl

RUN mkdir -p ./conf/certs && \
    chown grafana:root ./conf/certs

COPY ./tools /usr/local/bin
RUN chmod +x /usr/local/bin/init_grafana.sh

USER grafana

EXPOSE 3000

ENTRYPOINT ["/usr/local/bin/init_grafana.sh"]