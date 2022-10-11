set NODE_OPTIONS=--openssl-legacy-provider
start cmd /k yarn start:api
start cmd /k yarn start:web
start cmd /k yarn lib 