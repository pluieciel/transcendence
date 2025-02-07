FROM alpine:3.21 AS build

RUN apk add --no-cache envsubst

FROM grafana/grafana:11.4.0

WORKDIR /etc/grafana

USER root

COPY ./conf ./provisioning/

RUN chown -R grafana:nobody ./

COPY ./tools/ /usr/local/bin
RUN chmod +x /usr/local/bin/init_grafana.sh

COPY --from=build /usr/bin/envsubst /usr/bin/
COPY --from=build /usr/lib /usr/lib
COPY --from=build /lib /lib

USER grafana

EXPOSE 3000

ENTRYPOINT ["/usr/local/bin/init_grafana.sh"]
