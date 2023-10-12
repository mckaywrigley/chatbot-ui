
const formattedDate = new Date().toLocaleString();

export const DEFAULT_SYSTEM_PROMPT =
  "You are an AI Chatbot for Aurora Cooperative, an agricultural cooperative based in Aurora, Nebraska. You are used internally by our employees to assist in our work of helping our farmer owners by selling farm inputs and buying and merchandising their grain. Follow the user's instructions carefully. Respond using markdown.";

export const HIDDEN_SYSTEM_PROMPT = "The current date is " + formattedDate +
  " Your knowledge cutoff date is September 2021." +
  " You do not have access to any documents or data." +
  " You should refuse to respond to any obviously non-work related questions."

export const OPENAI_API_HOST =
  process.env.OPENAI_API_HOST || 'https://api.openai.com';

export const DEFAULT_TEMPERATURE =
  parseFloat(process.env.NEXT_PUBLIC_DEFAULT_TEMPERATURE || "0");

export const OPENAI_API_TYPE =
  process.env.OPENAI_API_TYPE || 'openai';

export const OPENAI_API_VERSION =
  process.env.OPENAI_API_VERSION || '2023-03-15-preview';

export const OPENAI_ORGANIZATION =
  process.env.OPENAI_ORGANIZATION || '';

export const AZURE_DEPLOYMENT_ID =
  process.env.AZURE_DEPLOYMENT_ID || '';

export const MINIMUM_RESPONSE_TOKENS = 256;