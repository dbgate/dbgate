# docker/node_modules is prepared on the runner, so rebuild native code on the target platform.
FROM node:22-slim AS native-dependencies

WORKDIR /home/dbgate-docker

COPY . .

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    g++ \
    make \
    python3 \
 && npm rebuild better-sqlite3 \
 && node -e "const Database = require('better-sqlite3'); const db = new Database(':memory:'); db.close(); console.log('better-sqlite3 loaded on ' + process.platform + '/' + process.arch)" \
 && rm -rf /var/lib/apt/lists/*

FROM node:22-slim

LABEL org.opencontainers.image.source="https://github.com/dbgate/dbgate"

RUN apt-get update && apt-get install -y \
    ca-certificates \
    iputils-ping \
    iproute2 \
    unixodbc \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /home/dbgate-docker

COPY --from=native-dependencies /home/dbgate-docker/ .

RUN ["chmod", "+x", "/home/dbgate-docker/entrypoint.sh"]

WORKDIR /home/dbgate-docker
EXPOSE 3000
VOLUME /root/.dbgate

CMD ["/home/dbgate-docker/entrypoint.sh"]
