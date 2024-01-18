.PHONY: start-chatbot-docker start-docker start-ui start-chatbot-local install-supabase start-supabase generate-db-types start-chatbot down-chatbot remove-chatbot remove-db install-ollama start-ollama remove-all pull-ollama-docker pull-mistral-local

# Start chatbot application using Docker
start-chatbot-docker: install-supabase start-supabase generate-db-types start-docker pull-mistral-docker

# Start chatbot application using local Ollama install
start-chatbot-local: install-ollama install-supabase start-supabase generate-db-types start-ui pull-mistral-local


### Setup Commands ###

build:
	docker compose build

install-supabase:
	./scripts/install_supabase.sh

start-supabase:
	@echo "Starting locally deployed Supabase..."
	supabase start

generate-db-types:
	@echo "Generating database types..."
	supabase gen types typescript --local > supabase/types.ts

install-ollama:
	./scripts/install_ollama.sh

start-ollama:
	@echo "Starting ollama service..."
	# sudo systemctl start ollama
	# Check if Ollama service is active and start it if not
	if ! systemctl is-active --quiet ollama; then
		echo "Starting Ollama service..."
		sudo systemctl start ollama
	else
		echo "Ollama service is already running."
	fi

### Start Commands ###

start-docker:
	@echo "Starting ollama Docker and Chatbot-ui Docker application..."
	docker compose up -d

start-ui:
	@echo "Starting Chatbot-ui Docker application..."
	docker compose -f docker-compose-ui.yml up -d;

pull-mistral-docker:
	@echo "Docker Pulling Mistral model...download may take a few moments..."
	docker exec ollama ollama pull mistral
	@echo "********************************************************************************"
	@echo "PLEASE OPEN YOUR WEB BROWSER AND NAVIGATE TO: http://localhost:3000"
	@echo "********************************************************************************"

pull-ollama-docker:
	@echo "Please enter the name of the model you wish to pull: "
	@read MODEL_NAME; docker exec ollama ollama pull $$MODEL_NAME

pull-mistral-local:
	@echo "Pulling Mistral model...download may take a few moments..."
	ollama pull mistral

### Shutdown commands ###

down-chatbot:
	@echo "Stopping chatbot-ui application and related services..."
	docker compose down

remove-chatbot:
	@echo "Stopping chatbot-ui application and related services..."
	docker compose down -v

remove-db:
	@echo "Removing current Supabase project and related services..."
	supabase stop --no-backup
	docker volume ls --filter label=com.supabase.cli.project=chatbotui -q | xargs -r docker volume rm


remove-all: remove-chatbot remove-db
	@echo "Removing and shutting down frontend and database servers..."

rebuild: remove-all build start-chatbot-docker
	@echo "Rebuilding the deployment..."
