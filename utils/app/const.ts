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

// 追加した環境変数
export const NEXT_PUBLIC_PAGE_TITLE =
  process.env.NEXT_PUBLIC_PAGE_TITLE || '';

export const NEXT_PUBLIC_CHATBOT_NAME =
  process.env.NEXT_PUBLIC_CHATBOT_NAME || '';

export const NEXT_PUBLIC_MESSAGE_TITLE =
  process.env.NEXT_PUBLIC_MESSAGE_TITLE || '';
  
export const NEXT_PUBLIC_CUSTOMIZED_MESSAGE1 =
  process.env.NEXT_PUBLIC_CUSTOMIZED_MESSAGE1 || '';

export const NEXT_PUBLIC_CUSTOMIZED_MESSAGE2 =
  process.env.NEXT_PUBLIC_CUSTOMIZED_MESSAGE2 || '';

export const NEXT_PUBLIC_CUSTOMIZED_MESSAGE3 =
  process.env.NEXT_PUBLIC_CUSTOMIZED_MESSAGE3 || '';
  
export const NEXT_PUBLIC_CUSTOMIZED_MESSAGE4 =
  process.env.NEXT_PUBLIC_CUSTOMIZED_MESSAGE4 || '';

export const NEXT_PUBLIC_CUSTOMIZED_MESSAGE5 =
  process.env.NEXT_PUBLIC_CUSTOMIZED_MESSAGE5 || '';

export const NEXT_PUBLIC_APPLICATION_DESCRIPTION =
  process.env.NEXT_PUBLIC_APPLICATION_DESCRIPTION || '';
