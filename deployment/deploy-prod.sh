#!/bin/bash

# curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
# sudo apt-get install -y nodejs

curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
source ~/.bashrc
nvm install 20

# Pull the latest changes from your Git repository (if you are using version control)
# Uncomment the next line if you are using Git
# git pull

# Install dependencies
npm install

# Build the Next.js app for production
npm run build

# npm run start

docker build -t chatgpt-ui ../.

docker stack deploy -c deploy-stack.yml chatgpt-stack