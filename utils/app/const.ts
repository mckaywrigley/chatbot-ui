export const DEFAULT_SYSTEM_PROMPT =
  process.env.NEXT_PUBLIC_DEFAULT_SYSTEM_PROMPT ||
  "You are ChatGPT, a large language model trained by OpenAI. Follow the user's instructions carefully. Respond using markdown.";

export const MODEL_API_HOST =
  process.env.OPENAI_API_HOST || 'http://0.0.0.0:8001'; // 'https://api.openai.com';

export const DEFAULT_TEMPERATURE = 
  parseFloat(process.env.NEXT_PUBLIC_DEFAULT_TEMPERATURE || "1");

export const DEFAULT_USER_ROLE =
    process.env.DEFAULT_USER_ROLE || "DOS_PROF";

export const MODEL_API_TYPE =
  process.env.OPENAI_API_TYPE ||  'query_cortex';  // 'openai';  // can be query_cortex, azure, or openapi

export const OPENAI_API_VERSION =
  process.env.OPENAI_API_VERSION || '2023-03-15-preview';

export const OPENAI_ORGANIZATION =
  process.env.OPENAI_ORGANIZATION || '';

export const AZURE_DEPLOYMENT_ID =
  process.env.AZURE_DEPLOYMENT_ID || '';
