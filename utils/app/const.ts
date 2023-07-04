export const DEFAULT_SYSTEM_PROMPT =
  process.env.NEXT_PUBLIC_DEFAULT_SYSTEM_PROMPT ||
  "You are an AI assistant. Follow the user's instructions carefully.";

export const BITAPAI_API_HOST =
  process.env.BITAPAI_API_HOST || 'https://api.bitapai.io';

export const MESSAGE_MAX_LENGTH = 1000;

export const VALIDATOR_ENDPOINT_API_HOST =
  process.env.VALIDATOR_ENDPOINT_API_HOST || 'https://validator-api.fabhed.dev';
