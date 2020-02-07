FROM node:8.16.2-buster
ADD ./server /server
WORKDIR /server

RUN npm install
# RUN cp docker_compose_secrets.js secrets.js
# RUN [ -d public/img ] || mkdir public/img  # this is to avoid problems on first load
## Create the database structure
CMD [ -d public/img ] || mkdir public/img && node_modules/knex/bin/cli.js migrate:latest && node updatecache.js &&  node server.js


