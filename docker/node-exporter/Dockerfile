FROM prom/node-exporter:v1.8.1

WORKDIR /etc/node_exporter

EXPOSE 9100

ENTRYPOINT ["/bin/node_exporter"]

CMD ["--path.procfs=/host/proc", \
    "--path.rootfs=/rootfs", \
    "--path.sysfs=/host/sys", \
    "--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)" ]
