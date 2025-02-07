FROM logstash:8.15.5

COPY ./conf .

USER root

RUN rm -f pipeline/logstash.conf

RUN groupadd -g 70 postgres && \
	usermod -aG postgres logstash

RUN mkdir -p ./pipeline ./logs /var/log/logstash && \
	chown -R logstash:root ./pipeline ./logs /var/log/logstash

COPY ./tools /usr/local/bin
RUN chmod +x /usr/local/bin/init_logstash.sh

USER logstash

EXPOSE 5044 9600

ENTRYPOINT ["/usr/local/bin/init_logstash.sh"]
