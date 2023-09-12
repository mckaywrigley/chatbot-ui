#!/bin/bash

# curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
# sudo apt-get install -y nodejs


# Pull the latest changes from your Git repository (if you are using version control)
# Uncomment the next line if you are using Git
# git pull

# Install dependencies
npm install

# Build the Next.js app for production
npm run build

# Launch local docker environment
echo "running docker compose"

docker-compose --env-file .env.local up



#npm run start
