FROM mysql:8.0.16

# Environment
ENV MYSQL_HOST=mysql
ENV MYSQL_PORT=3306
ENV MYSQL_USER=hb
ENV MYSQL_PASSWORD=b
ENV MYSQL_DATABASE=hummingbird
ENV MYSQL_ROOT_PASSWORD=1111

COPY ./docker-entrypoint-initdb.d /docker-entrypoint-initdb.d

EXPOSE 3306
