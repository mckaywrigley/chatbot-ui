#!/bin/sh

set -e

DTAG=$(date +"%Y%m%d%H%M%S")
echo "Building chatty-ai image..."
if docker build --platform linux/amd64 -f ./Dockerfile -t chatty-ai .; then
  echo "Image built successfully."
else
  echo "Image build failed."
  exit 1
fi

echo "Tagging chatty-ai image..."
if docker tag chatty-ai registry.digitalocean.com/francisco/chatty-ai:$DTAG; then
  echo "Image tagged successfully."
else
  echo "Image tagging failed."
  exit 1
fi

echo "Pushing chatty-ai image..."
if docker push registry.digitalocean.com/francisco/chatty-ai:$DTAG; then
  echo "registry.digitalocean.com/francisco/chatty-ai:$DTAG image push success"
else
  echo "Image push failed."
  exit 1
fi