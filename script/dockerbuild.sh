#!/bin/sh

cd ../
DTAG=$(date +"%Y%m%d%H%M%S")
docker build --platform linux/amd64 -f chatbot-ui/Dockerfile -t chatbot-ui .
docker tag chatbot-ui registry.digitalocean.com/francisco/chatbot-ui:$DTAG
docker push registry.digitalocean.com/francisco/chatbot-ui:$DTAG

echo "registry.digitalocean.com/francisco/chatbot-ui:$DTAG image push success"