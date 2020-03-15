# base image
FROM node:10

# set working directory
WORKDIR /home/jenasoft/dbgate

COPY . .

RUN yarn
RUN yarn build:api
RUN yarn build:web

# start app
WORKDIR /home/jenasoft/raftcz-frontend/build
EXPOSE 5000
# CMD yarn start
CMD serve -s
