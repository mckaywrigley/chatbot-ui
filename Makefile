.PHONY: all

build:
	docker build -t chatbot-ui .

run:
	docker compose up -d

logs:
	docker logs -f chatbot-ui

push:
	docker tag chatbot-ui:latest ${DOCKER_USER}/chatbot-ui:${DOCKER_TAG}
	docker push ${DOCKER_USER}/chatbot-ui:${DOCKER_TAG}