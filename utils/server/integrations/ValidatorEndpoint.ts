import { VALIDATOR_ENDPOINT_API_HOST } from '@/utils/app/const';

import { Message } from '@/types/chat';

export class ValidatorEndpointError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidatorEndpointError';
    this.message = message;
  }
}

export const ValidatorEndpointConversation = async (
  key: string,
  messages: Message[],
  systemPrompt: string,
) => {
  const url = `${VALIDATOR_ENDPOINT_API_HOST}/chat`;

  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${
        key ? key : process.env.VALIDATOR_ENDPOINT_API_KEY
      }`,
    },
    method: 'POST',
    body: JSON.stringify({
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        ...messages,
      ],
      top_n: 1,
    }),
  });

  const json = await res.json();

  if (res.status !== 200) {
    throw new ValidatorEndpointError(
      `Validator Endpoint Error: ${json.detail}`,
    );
  }

  return json?.['choices'][0]['message']['content'] || '';
};
