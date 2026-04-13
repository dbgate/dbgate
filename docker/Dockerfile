FROM node:22

LABEL org.opencontainers.image.source="https://github.com/dbgate/dbgate"

RUN apt-get update && apt-get install -y \
    iputils-ping \
    iproute2 \
    unixodbc \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /home/dbgate-docker

COPY . .

WORKDIR /home/dbgate-docker
EXPOSE 3000
VOLUME /root/.dbgate

# Start Node directly (not via shell script) so that env vars with hyphens
# in their names are preserved. POSIX shells silently drop env vars whose
# names contain characters invalid for shell identifiers (e.g. hyphens).
CMD ["node", "bundle.js", "--listen-api"]
