FROM kibana:8.15.5

COPY ./conf ./config

USER root

RUN mkdir -p /var/log/kibana && \
	chown -R kibana:root /var/log/kibana

COPY ./tools/ /usr/local/bin
RUN chmod +x /usr/local/bin/init_kibana.sh /usr/local/bin/setup_kibana.sh

RUN chown kibana:root ./config/kibana.yml

USER kibana

EXPOSE 5601

ENTRYPOINT ["/usr/local/bin/init_kibana.sh"]
