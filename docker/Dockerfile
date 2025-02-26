FROM node:22

RUN apt-get update && apt-get install -y \
    iputils-ping \
    iproute2 \
    unixodbc \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /home/dbgate-docker

COPY . .

RUN ["chmod", "+x", "/home/dbgate-docker/entrypoint.sh"]

WORKDIR /home/dbgate-docker
EXPOSE 3000
VOLUME /root/.dbgate

CMD ["/home/dbgate-docker/entrypoint.sh"]
