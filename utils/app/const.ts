import { Model } from '@/types/chat';

export const DEFAULT_SYSTEM_PROMPT =
  process.env.NEXT_PUBLIC_DEFAULT_SYSTEM_PROMPT ||
  "You are IQ Code, a large language model. Follow user's instructions carefully to generate smart contract code in solidity or vyper. after generating code, add a section for explaining how the generated code works and respond using markdown";

export const DEFAULT_TEMPERATURE = parseFloat(
  process.env.NEXT_PUBLIC_DEFAULT_TEMPERATURE || '1',
);

export const DEFAULT_MODEL = Model.PhindCodeLlamaV2;
