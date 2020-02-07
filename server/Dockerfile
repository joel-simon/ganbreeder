FROM node:8.16.2-buster
ADD ./server /server
WORKDIR /server

## Create the database structure
CMD npm install && [ -d public/img ] || mkdir public/img && node_modules/knex/bin/cli.js migrate:latest && node updatecache.js &&  node server.js
