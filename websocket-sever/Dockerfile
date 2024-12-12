## Use phusion/passenger-full as base image. To make your builds reproducible, make
## sure you lock down to a specific version, not to `latest`!
## See https://github.com/phusion/passenger-docker/blob/master/Changelog.md for
## a list of version numbers.
## Or, instead of the 'full' variant, use one of these:
FROM phusion/passenger-nodejs
#
## Set correct environment variables.
ENV HOME /root
#
## Use baseimage-docker's init process.
CMD ["/sbin/my_init"]

RUN mkdir /home/app/hummingbird
WORKDIR /home/app/hummingbird/

COPY --chown=app:app package.json .
 
RUN npm install

COPY . .

# CMD ["passenger", "start"]
#CMD ["passenger", "start", "--port", "3001"]
CMD ["npm", "run", "dev"]
