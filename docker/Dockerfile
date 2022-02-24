FROM node:14

WORKDIR /home/dbgate-docker

COPY . .

WORKDIR /home/dbgate-docker
EXPOSE 3000
VOLUME /root/dbgate-data
CMD node bundle.js
