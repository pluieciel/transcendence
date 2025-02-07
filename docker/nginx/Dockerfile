FROM nginx:1.26.2-alpine AS build

WORKDIR /build

RUN apk update && \
    apk upgrade && \
    apk add --no-cache \
    openssl \
    gcc \
    libc-dev \
    make \
    openssl-dev \
    pcre-dev \
    zlib-dev \
    git \
    jansson-dev

RUN wget http://nginx.org/download/nginx-1.26.2.tar.gz && \
    tar -zxf nginx-1.26.2.tar.gz && \
    rm nginx-1.26.2.tar.gz

RUN git clone https://github.com/kjdev/nginx-auth-jwt.git && \
    cd nginx-1.26.2 && \
    ./configure --with-compat --add-dynamic-module=../nginx-auth-jwt && \
    make modules

FROM nginx:1.26.2-alpine

WORKDIR /var/www/html

COPY --from=build /build/nginx-1.26.2/objs/ngx_http_auth_jwt_module.so /etc/nginx/modules/

RUN apk add --no-cache \
    openssl \
    jansson

RUN mkdir -p /etc/nginx/certs

COPY ./conf/ /etc/nginx/
RUN chown -R nginx:nginx /etc/nginx/nginx.conf

COPY ./tools/ /usr/local/bin
RUN chmod +x /usr/local/bin/init_nginx.sh

RUN rm /var/log/nginx/access.log /var/log/nginx/error.log && \
    touch /var/log/nginx/access.log /var/log/nginx/error.log && \
    chown nginx:nginx /var/log/nginx/access.log /var/log/nginx/error.log

EXPOSE 9000

ENTRYPOINT ["/usr/local/bin/init_nginx.sh"]
