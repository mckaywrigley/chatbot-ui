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

export const AZURE_DEPLOYMENT_ID = process.env.AZURE_DEPLOYMENT_ID || '';

export const API_ENTRYPOINT =
  process.env.NEXT_PUBLIC_API_ENTRYPOINT || 'SumUp Azure OpenAI Chat UI';

export const PRIVATE_API_ENTRYPOINT =
  process.env.NEXT_PUBLIC_PRIVATE_API_ENTRYPOINT ||
  'SumUp Azure OpenAI Chat UI';

export const WORKSPACES_ENDPOINT =
  process.env.NEXT_PUBLIC_WORKSPACES_ENDPOINT || 'SumUp Azure OpenAI Chat UI';
