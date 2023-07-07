import { Models } from '@/utils/config/models';

import { Message } from '@/types/chat';

interface Props {
  key: string;
  messages: Message[];
  systemPrompt: string;
  apiId: string;
}

export class APIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConversationApiError';
  }
}

export const ConversationApi = async ({
  key,
  messages,
  systemPrompt,
  apiId,
}: Props) => {
  const currentApi = Models.find((model) => model.id === apiId);

  if (!currentApi) {
    throw new Error("Selected API hasn't been implemented.");
  }

  const {
    endpoint,
    defaultPrompt,
    errorExtractor,
    responseExtractor,
    requestBuilder,
  } = currentApi;

  const res = await fetch(
    endpoint,
    requestBuilder(key, [
      {
        role: 'system',
        content: systemPrompt || defaultPrompt,
      },
      ...messages,
    ]),
  );

  const json = await res.json();
  console.log(json);

  if (res.status !== 200) {
    const extractedErrorMEssage = errorExtractor(json);
    throw new APIError(extractedErrorMEssage);
  }

  return responseExtractor(json);
};
