FROM nginx:stable-alpine3.19-perl

WORKDIR /var/www/html

COPY ./conf/ /etc/nginx/

RUN chown nginx:nginx /etc/nginx/nginx.conf

RUN rm /var/log/nginx/access.log /var/log/nginx/error.log && \
    touch /var/log/nginx/access.log /var/log/nginx/error.log && \
    chown nginx:nginx /var/log/nginx/access.log /var/log/nginx/error.log