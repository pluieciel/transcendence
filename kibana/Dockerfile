FROM kibana:8.15.5

COPY ./conf ./config

USER root

COPY ./tools /usr/local/bin
RUN chmod +x /usr/local/bin/init_kibana.sh

USER kibana

ENTRYPOINT ["/usr/local/bin/init_kibana.sh"]