import { StorageType } from '@/types/storage';


export const DEFAULT_SYSTEM_PROMPT =
  process.env.NEXT_PUBLIC_DEFAULT_SYSTEM_PROMPT ||
  "You are ChatGPT, a large language model trained by OpenAI. Follow the user's instructions carefully. Respond using markdown.";

export const OPENAI_API_HOST =
  process.env.OPENAI_API_HOST || 'https://api.openai.com';

export const DEFAULT_TEMPERATURE =
  parseFloat(process.env.NEXT_PUBLIC_DEFAULT_TEMPERATURE || '1');

export const OPENAI_API_TYPE =
  process.env.OPENAI_API_TYPE || 'openai';

export const OPENAI_API_VERSION =
  process.env.OPENAI_API_VERSION || '2023-03-15-preview';

export const OPENAI_ORGANIZATION =
  process.env.OPENAI_ORGANIZATION || '';

export const STORAGE_TYPE =
  (process.env.STORAGE_TYPE || 'local') as StorageType;

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

export const RDBMS_DB_TYPE=
  process.env.RDBMS_DB_TYPE || 'postgres';

export const RDBMS_HOST =
  process.env.RDBMS_HOST || '127.0.0.1';

export const RDBMS_PORT =
  parseInt(process.env.RDBMS_PORT || '5432') ;

export const RDBMS_DB =
  process.env.RDBMS_DB || 'postgres';

export const RDBMS_USER =
  process.env.RDBMS_USER || 'postgres';

export const RDBMS_PASS =
  process.env.RDBMS_PASS || 'password';

export const RDBMS_SYNCHRONIZE =
  !(process.env.RDBMS_SYNCHRONIZE == 'false') || true;

export const RDBMS_SSL_ENABLED =
  (process.env.RDBMS_SSL_ENABLED == 'true') || false;

export const RDBMS_SSL_HOST =
  process.env.RDBMS_SSL_HOST || '';

export const RDBMS_SSL_CA =
  process.env.RDBMS_SSL_CA || '';

export const RDBMS_SSL_CERT =
  process.env.RDBMS_SSL_CERT || '';

export const RDBMS_SSL_KEY =
  process.env.RDBMS_SSL_KEY || '';

export const RDBMS_COCKROACHDB_TIME_TRAVEL_QUERIES =
  (process.env.RDBMS_COCKROACHDB_TIME_TRAVEL_QUERIES == 'true') || false;

export const NEXT_PUBLIC_NEXTAUTH_ENABLED =
  (process.env.NEXT_PUBLIC_NEXTAUTH_ENABLED == 'true') || false;