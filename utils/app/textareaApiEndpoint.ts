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

    // Check if the response is an error before reading the body
    if (!res.ok) {
      throw new Error(`textareaApiEndpoint request failed with status ${res.status}`);
    }

    return await res.text();
  },
);
