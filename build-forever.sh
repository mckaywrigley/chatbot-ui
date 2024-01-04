#!/bin/bash

# curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
# sudo apt-get install -y nodejs

nvm install 20

# Pull the latest changes from your Git repository (if you are using version control)
# Uncomment the next line if you are using Git
# git pull

# Install dependencies
npm install

# Build the Next.js app for production
npm run build

if [ "$1" == "production" ]
then
    docker-compose up -d
else
    docker-compose -f compose-dev.yml up -d
fi
