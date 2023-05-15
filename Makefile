include .env

.PHONY: all

build:
	docker build -t chatty-ai .

run:
	export $(cat .env | xargs)
	docker stop chatty-ai || true && docker rm chatty-ai || true
	docker run --name chatty-ai --rm -e OPENAI_API_KEY=${OPENAI_API_KEY} -p 3000:3000 chatty-ai

logs:
	docker logs -f chatty-ai

push:
	docker tag chatty-ai:latest ${DOCKER_USER}/chatty-ai:${DOCKER_TAG}
	docker push ${DOCKER_USER}/chatty-ai:${DOCKER_TAG}