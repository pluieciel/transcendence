FROM elasticsearch:8.15.5

COPY ./conf ./config

USER root

COPY ./tools /usr/local/bin
RUN chmod +x /usr/local/bin/healthcheck.sh /usr/local/bin/init_elasticsearch.sh

RUN chown elasticsearch:root ./config/elasticsearch.yml

USER elasticsearch

EXPOSE 9200 9300

ENTRYPOINT ["/usr/local/bin/init_elasticsearch.sh"]
