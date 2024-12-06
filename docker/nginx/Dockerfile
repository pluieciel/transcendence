FROM nginx:stable-alpine3.19-perl

COPY ./conf/server9000.conf /etc/nginx/conf.d/

RUN apk add curl

ENTRYPOINT ["/usr/sbin/nginx", "-g", "daemon off;"]
