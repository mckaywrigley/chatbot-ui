import {
  ChatlikeApiEndpoint,
  MinimalChatGPTMessage,
} from '@copilotkit/react-textarea';

import { getEndpoint } from './api';

export const textareaApiEndpoint = ChatlikeApiEndpoint.custom(
  async (
    abortSignal: AbortSignal,
    messages: MinimalChatGPTMessage[],
    forwardedParams?: { [key: string]: any },
  ) => {
    const chatEndpoint = getEndpoint(null);

    const prompt = messages.find((m) => m.role === 'system')?.content || '';
    const remainingMessages = messages.filter((m) => m.role !== 'system');

    const res = await fetch(chatEndpoint, {
      method: 'POST',
      body: JSON.stringify({
        prompt: prompt,
        messages: remainingMessages,
        max_tokens: 5,
        ...forwardedParams,
      }),
      signal: abortSignal,
    });

    const fullPayload = await res.text();

    // check if the response is an error
    if (res.status !== 200) {
      throw new Error(fullPayload);
    }

    return fullPayload;
  },
);
