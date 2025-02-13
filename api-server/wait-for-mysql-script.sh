#!/bin/sh

# Wait until MySQL is ready
while ! mysqladmin ping -h"mysql" -P"3306" --silent; do
    echo "Waiting for MySQL to be up!!!"
    sleep 2
done