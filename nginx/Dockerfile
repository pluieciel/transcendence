FROM nginx:stable-alpine3.19-perl

WORKDIR /var/www/html

COPY ./conf/ /etc/nginx/

COPY ./tools/ /var/www/static

RUN chown nginx:nginx /etc/nginx/nginx.conf

RUN mkdir -p /var/www/html && \
    chown -R nginx:nginx /var/www/html

RUN mkdir -p /var/www/static && \
    chmod -R 777 /var/www/static

RUN rm /var/log/nginx/access.log /var/log/nginx/error.log && \
    touch /var/log/nginx/access.log /var/log/nginx/error.log && \
    chown nginx:nginx /var/log/nginx/access.log /var/log/nginx/error.log

ENTRYPOINT ["/usr/sbin/nginx", "-g", "daemon off;"]
