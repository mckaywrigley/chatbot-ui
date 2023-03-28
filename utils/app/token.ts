import { Message } from '@/types/chat';
import GPT3Tokenizer from 'gpt3-tokenizer';

export const tokenizer = new GPT3Tokenizer({ type: 'gpt3' }); // or 'codex'

export const countTokens = (str?: string) =>
  tokenizer.encode(str || '').bpe.length;

export const messagesTokensCount = (messages: Message[]) => {
  const counts = messages.map((message) => countTokens(message.content));
  return counts.reduce((pv, count) => pv + count, 0);
};
