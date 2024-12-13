FROM elasticsearch:8.15.5

COPY ./conf ./config

USER root

RUN mkdir -p ./config/certs && \
	chown elasticsearch:root ./config/certs && \
	chmod 775 ./config/certs

COPY ./tools /usr/local/bin
RUN chmod +x /usr/local/bin/healthcheck.sh /usr/local/bin/init_elasticsearch.sh

RUN chown elasticsearch:root ./config/elasticsearch.yml

USER elasticsearch

ENTRYPOINT ["/usr/local/bin/init_elasticsearch.sh"]
