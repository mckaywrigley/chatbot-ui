include .env

.PHONY: all

build:
	docker build -t jarvis-client .

run:
	export $(cat .env | xargs)
	docker stop jarvis-client || true && docker rm jarvis-client || true
	docker run --name jarvis-client --rm -e JARVISAI_API_HOST=${JARVISAI_API_HOST} JARVISAI_API_KEY=${JARVISAI_API_KEY} -p 3000:3000 jarvis-client

logs:
	docker logs -f jarvis-client

push:
	docker tag jarvis-client:latest ${DOCKER_USER}/jarvis-client:${DOCKER_TAG}
	docker push ${DOCKER_USER}/jarvis-client:${DOCKER_TAG}