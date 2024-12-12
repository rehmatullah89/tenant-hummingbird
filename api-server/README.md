# API-SERVER
Application to handle incoming/outgoing requests related to Hummingbird systems.

[![pipeline status](https://gitlab.com/storageapi/hummingbird/api-server/badges/uat/pipeline.svg)](https://gitlab.com/storageapi/hummingbird/api-server/-/commits/uat)
[![coverage report](https://gitlab.com/storageapi/hummingbird/api-server/badges/uat/coverage.svg)](https://gitlab.com/storageapi/hummingbird/api-server/-/commits/uat)

## Local Development
### Local Docker-compose
1) Local docker setup is designed to attach to an existing network, so make sure you have it up and running if you want to send requests
2) Run ```docker-compose up``` to start the swagger container
3) In your browser, navigate to [swagger-docs](http://localhost:8080)
4) break stuff

## In order to run test cases, do following steps
- Run command `docker-compose -f docker-compose-test.yml up --exit-code-from api`

## In order to run coverage, do following steps
- Run command `docker-compose -f docker-compose-test.yml run --rm api npm run coverage`
