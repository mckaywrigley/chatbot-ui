export const DEFAULT_SYSTEM_PROMPT =
  process.env.NEXT_PUBLIC_DEFAULT_SYSTEM_PROMPT ||
  "You are ChatGPT, a large language model trained by OpenAI. Follow the user's instructions carefully. Respond using markdown.";

export const DEFAULT_TEMPERATURE = parseFloat(
  process.env.NEXT_PUBLIC_DEFAULT_TEMPERATURE || '1',
);
