import { ChatlikeApiEndpoint, MinimalChatGPTMessage } from "@copilotkit/react-textarea";

export const textareaApiEndpoint = ChatlikeApiEndpoint.custom(
  async (
    abortSignal: AbortSignal,
    messages: MinimalChatGPTMessage[],
    forwardedProps?: { [key: string]: any },
  ) => {
    const res = await fetch('api/autosuggestions', {
      method: 'POST',
      body: JSON.stringify({
        ...forwardedProps,
        messages: messages,
        max_tokens: 5,
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
