FROM elasticsearch:8.15.5

USER root

COPY ./tools /usr/local/bin
RUN chmod +x /usr/local/bin/healthcheck.sh

USER elasticsearch