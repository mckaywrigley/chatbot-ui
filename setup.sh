#!/bin/bash
# This script will setup the project for you
# Note it is designed to run as a 1 click setup on gitpod/codespaces so it may not work on your machine
npm install

# check if supabase is installed
if ! command -v supabase &> /dev/null
then
   brew install supabase/tap/supabase
fi

supabase start
supabase migration up
# Command to get your output, replace 'your_command' with the actual command
output=$(supabase status | tail -n 2)


# Extract and format the keys
anon_key=$(echo "$output" | grep "anon key" | awk -F': ' '{print $2}')
service_role_key=$(echo "$output" | grep "service_role key" | awk -F': ' '{print $2}')

# Write to .env.local
{
    echo "# Supabase Public"
    echo "NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321"
    echo "# Supabase Anon"
    echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=$anon_key"
    echo "# Supabase Private"
    echo "SUPABASE_SERVICE_ROLE_KEY=$service_role_key"
    echo "# OpenAI API Key"
    echo "OPENAI_API_KEY=$OPENAI_API_KEY"
    echo "# Ollama"
    echo "NEXT_PUBLIC_OLLAMA_URL=http://localhost:11434"
} > .env.local
