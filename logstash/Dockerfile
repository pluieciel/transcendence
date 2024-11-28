FROM logstash:8.15.5

WORKDIR /usr/share/logstash/

COPY ./conf ./pipeline

USER root

RUN groupadd -g 70 postgres && \
    usermod -aG postgres logstash && \
    mkdir -p /var/log/postgres && \
    chown -R logstash:postgres /var/log/postgres

RUN rm pipeline/logstash.conf

RUN mkdir -p /usr/share/logstash/logs && \
    chown -R logstash:logstash /usr/share/logstash/logs

USER logstash