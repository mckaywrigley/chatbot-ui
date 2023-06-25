docker build -t chatgpt-ui-dev:latest .
docker run -e OPENAI_API_KEY=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 -p 3001:3000 chatgpt-ui-dev:latest
