FROM logstash:8.15.5

WORKDIR /usr/share/logstash/

COPY ./conf .

USER root

RUN rm -f pipeline/logstash.conf

RUN groupadd -g 70 postgres && \
    usermod -aG postgres logstash && \
    mkdir -p /var/log/postgres && \
    chown -R logstash:postgres /var/log/postgres && \
    mkdir -p pipeline && \
    chown -R logstash:logstash pipeline && \
    mkdir -p logs /var/log/logstash && \
    chown -R logstash:logstash logs /var/log/logstash && \
    chmod -R 775 pipeline logs /var/log/logstash

USER logstash
