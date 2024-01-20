#!/bin/bash

# Check if Ollama is installed
if ! command -v ollama &> /dev/null; then
    echo "Ollama is not installed. Installing..."
    curl https://ollama.ai/install.sh | sh
else
    echo "Ollama is already installed."
fi

# Check if Ollama service is active and start it if not
if ! systemctl is-active --quiet ollama; then
    echo "Starting Ollama service..."
    sudo systemctl start ollama
else
    echo "Ollama service is already running."
fi
