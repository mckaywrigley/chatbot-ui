import { Message } from '@/types/chat';
import { OpenAIModel } from '@/types/openai';

import { AZURE_DEPLOYMENT_ID, MODEL_API_HOST, MODEL_API_TYPE, OPENAI_API_VERSION, OPENAI_ORGANIZATION } from '../app/const';

import {
  ParsedEvent,
  ReconnectInterval,
  createParser,
} from 'eventsource-parser';

export class OpenAIError extends Error {
  type: string;
  param: string;
  code: string;

  constructor(message: string, type: string, param: string, code: string) {
    super(message);
    this.name = 'OpenAIError';
    this.type = type;
    this.param = param;
    this.code = code;
  }
}

export const OpenAIStream = async (
  model: OpenAIModel,
  systemPrompt: string,
  temperature : number,
  key: string,
  messages: Message[],
  userRole: string
) => {
  let url = `${MODEL_API_HOST}/v1/chat/completions`;
  if (MODEL_API_TYPE === 'azure') {
    url = `${MODEL_API_HOST}/openai/deployments/${AZURE_DEPLOYMENT_ID}/chat/completions?api-version=${OPENAI_API_VERSION}`;
  }
  if (MODEL_API_TYPE === 'query_cortex') {
    url = `${MODEL_API_HOST}/query`;
  }
  // payload for openai api
  let payload: string = JSON.stringify({
    ...(MODEL_API_TYPE === 'openai' && {model: model.id}),
    messages: [
      {
        role: 'system',
        content: systemPrompt,
      },
      ...messages,
    ],
    max_tokens: 1000,
    temperature: temperature,
    stream: true,
  })
  // payload for query cortex api
  if (MODEL_API_TYPE === 'query_cortex') {
    payload = JSON.stringify({
      user_role: userRole,
      message: messages[messages.length - 1].content
    })
  }
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(MODEL_API_TYPE === 'openai' && {
        Authorization: `Bearer ${key ? key : process.env.OPENAI_API_KEY}`
      }),
      ...(MODEL_API_TYPE === 'azure' && {
        'api-key': `${key ? key : process.env.OPENAI_API_KEY}`
      }),
      ...((MODEL_API_TYPE === 'openai' && OPENAI_ORGANIZATION) && {
        'OpenAI-Organization': OPENAI_ORGANIZATION,
      }),
    },
    method: 'POST',
    body: payload,
  });

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  if (res.status !== 200) {
    const result = await res.json();
    if (result.error) {
      throw new OpenAIError(
        result.error.message,
        result.error.type,
        result.error.param,
        result.error.code,
      );
    } else {
      throw new Error(
        `OpenAI API returned an error: ${
          decoder.decode(result?.value) || result.statusText
        }`,
      );
    }
  }

  let stream: ReadableStream = new ReadableStream({
    async start(controller) {
      const onParse = (event: ParsedEvent | ReconnectInterval) => {
        if (event.type === 'event') {
          const data = event.data;

          try {
            const json = JSON.parse(data);
            if (json.choices[0].finish_reason != null) {
              controller.close();
              return;
            }
            const text = json.choices[0].delta.content;
            const queue = encoder.encode(text);
            controller.enqueue(queue);
          } catch (e) {
            controller.error(e);
          }
        }
      };

      const parser = createParser(onParse);

      for await (const chunk of res.body as any) {
        let decoded_chunk = decoder.decode(chunk)
        if (MODEL_API_TYPE === 'query_cortex') {
          const json = JSON.parse(decoded_chunk);
          const message = json.message;
          const queue = encoder.encode(message);
          controller.enqueue(queue);
          controller.close();
        } else {
          parser.feed(decoded_chunk);
        }
      }
    },
  });

  return stream;
};
