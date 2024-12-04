FROM nginx:stable-alpine3.19-perl

COPY ./conf/ /etc/nginx/

COPY ./tools/ /var/www/static

RUN chown nginx:nginx /etc/nginx/nginx.conf

RUN mkdir -p /var/www/html && \
    chown -R nginx:nginx /var/www/html

RUN mkdir -p /var/www/static && \
    chmod -R 777 /var/www/static

ENTRYPOINT ["/usr/sbin/nginx", "-g", "daemon off;"]
