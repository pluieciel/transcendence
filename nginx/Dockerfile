FROM nginx:stable-alpine3.19-perl

COPY ./conf/ /etc/nginx/

RUN chown nginx:nginx /etc/nginx/nginx.conf

ENTRYPOINT ["/usr/sbin/nginx", "-g", "daemon off;"]
