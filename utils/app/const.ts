export const DEFAULT_SYSTEM_PROMPT =
  process.env.NEXT_PUBLIC_DEFAULT_SYSTEM_PROMPT ||
  "You are ChatGPT, a large language model trained by OpenAI. Follow the user's instructions carefully. Respond using markdown.";

export const OPENAI_API_HOST =
  process.env.OPENAI_API_HOST || 'https://api.openai.com';

export const DEFAULT_TEMPERATURE = parseFloat(
  process.env.NEXT_PUBLIC_DEFAULT_TEMPERATURE || '1',
);

export const OPENAI_API_TYPE = process.env.OPENAI_API_TYPE || 'openai';

export const OPENAI_API_VERSION =
  process.env.OPENAI_API_VERSION || '2023-03-15-preview';

export const OPENAI_ORGANIZATION = process.env.OPENAI_ORGANIZATION || '';


export const API_ENTRYPOINT =
  process.env.NEXT_PUBLIC_API_ENTRYPOINT || 'http://127.0.0.1:3000/api';

export const PRIVATE_API_ENTRYPOINT =
  process.env.NEXT_PUBLIC_PRIVATE_API_ENTRYPOINT || 'private';

export const WORKSPACES_ENDPOINT =
  process.env.NEXT_PUBLIC_WORKSPACES_ENDPOINT || 'workspace';

export const PROMPT_ENDPOINT =
process.env.NEXT_PUBLIC_WORKSPACES_ENDPOINT || 'prompt';

export const APP_NAME = process.env.APP_NAME || 'Zeno Chat UI';

export const AZURE_DEPLOYMENT_ID =
  process.env.AZURE_DEPLOYMENT_ID || '';

export const LOGIN_REQUIRED = 
  process.env.LOGIN_REQUIRED || 'false';

export const API_BASE_URL = 
  process.env.API_BASE_URL || 'https://api.openai.com';

export const LOG_INCOMING_MESSAGES =
 process.env.LOG_INCOMING_MESSAGES || 'false';

export const LOG_TRIM_MESSAGES =
 process.env.LOG_TRIM_MESSAGES || 'false';

export const PUBLIC_API_ENTRYPOINT = 
 process.env.PUBLIC_API_ENTRYPOINT || 'public';

export const AUTH_ENDPOINT = 
  process.env.WORKSPACES_ENDPOINT || 'auth';
