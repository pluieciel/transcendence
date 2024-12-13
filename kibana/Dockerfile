FROM kibana:8.15.5

COPY ./conf ./config

USER root

RUN mkdir -p /var/log/kibana ./config/certs && \
	chown -R kibana:root /var/log/kibana ./config/certs && \
	chmod 775 ./config/certs

COPY ./tools/ /usr/local/bin
RUN chmod +x /usr/local/bin/init_kibana.sh /usr/local/bin/setup_kibana.sh

RUN chown kibana:root ./config/kibana.yml

USER kibana

ENTRYPOINT ["/usr/local/bin/init_kibana.sh"]
