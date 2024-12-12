#FROM node:lts-alpine
#
## install simple http server for serving static content
#RUN npm install -g http-server
#
## make the 'app' folder the current working directory
#WORKDIR /app
#
## copy both 'package.json' and 'package-lock.json' (if available)
#COPY package*.json ./
#
## install project dependencies
#RUN npm install
#
## copy project files and folders to the current working directory (i.e. 'app' folder)
#COPY . .
#
## build app for production with minification
#RUN npm run build
#
#EXPOSE 80
#CMD [ "http-server", "dist", "-p", "80", "-g", "--proxy", "http://localhost?" ]


FROM node:lts-alpine as build-stage
WORKDIR /app




COPY package*.json ./
RUN apk update && apk add yarn python3 g++ make && rm -rf /var/cache/apk/*
RUN npm install
COPY . .


ARG VUE_APP_API_PORT
ARG VUE_APP_WORKER_PORT
ARG VUE_APP_API_SUBDOMAIN
ARG VUE_APP_DOMAIN
ARG VUE_APP_WORKER_SUBDOMAIN
ARG VUE_APP_API_PROTOCOL
ARG VUE_APP_WEBSOCKET_SERVER_APP_ENDPOINT
ARG VUE_APP_WORKER_SUBDOMAIN

ARG VUE_APP_DOCMANAGER_BASE_URL
ARG VUE_APP_DOC_GDS_API_KEY
ARG VUE_APP_DOC_AUTH_TOKEN

ENV VUE_APP_API_PORT=$VUE_APP_API_PORT
ENV VUE_APP_WORKER_PORT=$VUE_APP_WORKER_PORT
ENV VUE_APP_API_SUBDOMAIN=$VUE_APP_API_SUBDOMAIN
ENV VUE_APP_WORKER_SUBDOMAIN=$VUE_APP_WORKER_SUBDOMAIN

ENV VUE_APP_DOMAIN $VUE_APP_DOMAIN
ENV VUE_APP_API_PROTOCOL $VUE_APP_API_PROTOCOL
ENV VUE_APP_WEBSOCKET_SERVER_APP_ENDPOINT $VUE_APP_WEBSOCKET_SERVER_APP_ENDPOINT
ENV VUE_APP_WORKER_SUBDOMAIN $VUE_APP_WORKER_SUBDOMAIN

ENV VUE_APP_DOCMANAGER_BASE_URL=$VUE_APP_DOCMANAGER_BASE_URL
ENV VUE_APP_DOC_GDS_API_KEY=$VUE_APP_DOC_GDS_API_KEY
ENV VUE_APP_DOC_AUTH_TOKEN=$VUE_APP_DOC_AUTH_TOKEN

RUN echo $VUE_APP_API_PORT
RUN echo $VUE_APP_WORKER_PORT
RUN echo $VUE_APP_API_SUBDOMAIN
RUN echo $VUE_APP_WORKER_SUBDOMAIN
RUN echo $VUE_APP_DOMAIN
RUN echo $VUE_APP_API_PROTOCOL
RUN echo $VUE_APP_WEBSOCKET_SERVER_APP_ENDPOINT
RUN echo $VUE_APP_WORKER_SUBDOMAIN

RUN echo $VUE_APP_DOCMANAGER_BASE_URL
RUN echo $VUE_APP_DOC_GDS_API_KEY
RUN echo $VUE_APP_DOC_AUTH_TOKEN

RUN npm run build

# production stage
FROM nginx:stable-alpine as production-stage
COPY --from=build-stage /app/dist /usr/share/nginx/html
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx/nginx.conf /etc/nginx/conf.d
ADD replace_hb_web_server_static_var.sh .
RUN chmod +x replace_hb_web_server_static_var.sh
EXPOSE 80
CMD ["/bin/sh", "-c", "sh replace_hb_web_server_static_var.sh && nginx -g 'daemon off;'"]
