FROM nginx:stable-alpine3.19-perl

WORKDIR /var/www/html

RUN apk update && \
	apk upgrade && \
	apk add --no-cache \
	apache2-utils \
	openssl

COPY ./conf/ /etc/nginx/conf.d/
RUN chown nginx:nginx /etc/nginx/nginx.conf

COPY ./tools/ /usr/local/bin
RUN chmod +x /usr/local/bin/init_nginx.sh

RUN rm /var/log/nginx/access.log /var/log/nginx/error.log && \
	touch /var/log/nginx/access.log /var/log/nginx/error.log && \
	chown nginx:nginx /var/log/nginx/access.log /var/log/nginx/error.log

EXPOSE 9000

ENTRYPOINT ["/usr/local/bin/init_nginx.sh"]
