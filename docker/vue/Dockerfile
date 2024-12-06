FROM node:22.12.0-alpine3.19

WORKDIR /usr/src/app

EXPOSE 8080

COPY ./tools/start_vue.sh /usr/local/bin/start_vue.sh
RUN chmod +x /usr/local/bin/start_vue.sh
RUN apk add curl

ENTRYPOINT ["/usr/local/bin/start_vue.sh"]
