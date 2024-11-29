FROM logstash:8.15.5

WORKDIR /usr/share/logstash/

COPY ./conf .

USER root

RUN rm -f pipeline/logstash.conf

RUN groupadd -g 70 postgres && \
	usermod -aG postgres logstash

RUN mkdir -p pipeline logs /var/log/logstash && \
	chown -R logstash:root pipeline logs /var/log/logstash

USER logstash
