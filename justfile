_default:
    just --list

# this help message (default target)
help:
    just --list

##############################################################

# run non alpine image
run-non-alpine tag="latest":
    docker run -it \
               --rm \
               --name dbgate \
               --env-file .env.local \
               -p 3000:3000 \
               fshevchuk/dbgate:{{ tag }}

# run alpine image
run-alpine tag="latest":
    docker run -it \
               --rm \
               --name dbgate \
               --env-file .env.local \
               -p 3000:3000 \
               fshevchuk/dbgate:{{ tag }}-alpine
