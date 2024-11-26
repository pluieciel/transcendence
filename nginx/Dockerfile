FROM nginx:stable-alpine3.19-perl

COPY ./conf/ /etc/nginx/

RUN chown nginx:nginx /etc/nginx/nginx.conf

RUN mkdir -p /var/www/html && \
    chown -R nginx:nginx /var/www/html

ENTRYPOINT ["/usr/sbin/nginx", "-g", "daemon off;"]
