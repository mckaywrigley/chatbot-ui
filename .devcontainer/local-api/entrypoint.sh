#!/bin/bash
set -e

echo "MODEL=$MODEL"

if [ "$MODEL" = "/models/ggml-vicuna-7b-4bit.bin" ]; then
    # If the file doesn't exists, download it.
    if [ ! -f "$MODEL" ]; then
        wget --no-clobber https://huggingface.co/eachadea/ggml-vicuna-7b-4bit/resolve/main/ggml-vicuna-7b-4bit.bin -O /models/ggml-vicuna-7b-4bit.bin;
    fi
fi

exec uvicorn --app-dir=/app/examples/high_level_api --reload --host 0.0.0.0 fastapi_server:app