#!/bin/sh

set -e

DTAG=$(date +"%Y%m%d%H%M%S")
echo "Building chatbot-ui image..."
if docker build --platform linux/amd64 -f ./Dockerfile -t chatbot-ui .; then
  echo "Image built successfully."
else
  echo "Image build failed."
  exit 1
fi

echo "Tagging chatbot-ui image..."
if docker tag chatbot-ui registry.digitalocean.com/francisco/chatbot-ui:$DTAG; then
  echo "Image tagged successfully."
else
  echo "Image tagging failed."
  exit 1
fi

echo "Pushing chatbot-ui image..."
if docker push registry.digitalocean.com/francisco/chatbot-ui:$DTAG; then
  echo "registry.digitalocean.com/francisco/chatbot-ui:$DTAG image push success"
else
  echo "Image push failed."
  exit 1
fi