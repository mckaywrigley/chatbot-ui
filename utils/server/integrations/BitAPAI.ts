import { Message } from '@/types/chat';

import { BITAPAI_API_HOST } from '../../app/const';

export class BitapaiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BitapaiError';
  }
}

export const BitapaiConversation = async (
  key: string,
  messages: Message[],
  systemPrompt: string,
) => {
  const url = `${BITAPAI_API_HOST}/v1/conversation`;

  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': `${key ? key : process.env.BITAPAI_API_KEY}`,
    },
    method: 'POST',
    body: JSON.stringify([
      {
        role: 'system',
        content: systemPrompt,
      },
      ...messages,
    ]),
  });

  const json = await res.json();

  if (res.status !== 200) {
    throw new BitapaiError(`BitAPAI: ${json}`);
  }

  return json?.['assistant'] || '';
};
