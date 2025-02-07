FROM postgres:16.6-alpine3.19

WORKDIR /var/lib/postgresql/data

COPY ./conf/ /var/lib/postgresql/config

RUN mkdir -p /var/log/postgres && \
    chown -R postgres:postgres /var/log/postgres && \
    chmod -R 750 /var/log/postgres

EXPOSE 5432

CMD ["postgres", "-c", "config_file=/var/lib/postgresql/config/postgresql.conf"]
