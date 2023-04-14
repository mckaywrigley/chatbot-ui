export const DEFAULT_SYSTEM_PROMPT =
  process.env.NEXT_PUBLIC_DEFAULT_SYSTEM_PROMPT ||
  "You are ChatGPT, a large language model trained by OpenAI. Follow the user's instructions carefully. Respond using markdown.";

export const OPENAI_API_HOST =
  process.env.OPENAI_API_HOST || 'https://api.openai.com';

export const DEFAULT_TEMPERATURE = 
  parseFloat(process.env.NEXT_PUBLIC_DEFAULT_TEMPERATURE || "1");

export const OPENAI_API_TYPE =
  process.env.OPENAI_API_TYPE || 'openai';

export const OPENAI_API_VERSION =
  process.env.OPENAI_API_VERSION || '2023-03-15-preview';

export const OPENAI_ORGANIZATION =
  process.env.OPENAI_ORGANIZATION || '';

export const AZURE_DEPLOYMENT_ID =
  process.env.AZURE_DEPLOYMENT_ID || '';

export const DATABASE_TYPE =
  process.env.DATABASE_TYPE || 'localStorage';

export const COUCHDB_USER =
  process.env.COUCHDB_USER || 'admin';

export const COUCHDB_PASSWORD =
  process.env.COUCHDB_PASSWORD || 'password';

export const COUCHDB_HOST =
  process.env.COUCHDB_HOST || 'http://couchdb';

export const COUCHDB_PORT =
  process.env.COUCHDB_PORT || 5984;

export const COUCHDB_DATABASE =
  process.env.COUCHDB_DATABASE || 'chatbot';
