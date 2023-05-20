import { Message } from '@/types/chat';
import { OpenAIModel } from '@/types/openai';

import { AZURE_DEPLOYMENT_ID, OPENAI_API_HOST, OPENAI_API_TYPE, OPENAI_API_VERSION, OPENAI_ORGANIZATION } from '../app/const';

import {
  ParsedEvent,
  ReconnectInterval,
  createParser,
} from 'eventsource-parser';
import { read } from 'fs';

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
) => {
  let url = `${OPENAI_API_HOST}/v1/chat/completions`;
  if (OPENAI_API_TYPE === 'azure') {
    url = `${OPENAI_API_HOST}/openai/deployments/${AZURE_DEPLOYMENT_ID}/chat/completions?api-version=${OPENAI_API_VERSION}`;
  }
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(OPENAI_API_TYPE === 'openai' && {
        Authorization: `Bearer ${key ? key : process.env.OPENAI_API_KEY}`
      }),
      ...(OPENAI_API_TYPE === 'azure' && {
        'api-key': `${key ? key : process.env.OPENAI_API_KEY}`
      }),
      ...((OPENAI_API_TYPE === 'openai' && OPENAI_ORGANIZATION) && {
        'OpenAI-Organization': OPENAI_ORGANIZATION,
      }),
    },
    method: 'POST',
    body: JSON.stringify({
      ...(OPENAI_API_TYPE === 'openai' && {model: model.id}),
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
    }),
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

  const stream = new ReadableStream({
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
        parser.feed(decoder.decode(chunk));
      }
    },
  });

  return stream;
};


export const TrialGPTStream = async (
  model: OpenAIModel,
  systemPrompt: string,
  temperature : number,
  // key: string,
  messages: Message[],
) => {
  let url = 'http://127.0.0.1:8000/api/chat/' // flask server
  // let url = `${OPENAI_API_HOST}/v1/chat/completions`;
  // if (OPENAI_API_TYPE === 'azure') {
  //   url = `${OPENAI_API_HOST}/openai/deployments/${AZURE_DEPLOYMENT_ID}/chat/completions?api-version=${OPENAI_API_VERSION}`;
  // }

  const requestData = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsImV4cCI6MTY4NDIwMzYyNX0.TYnOWSp4nmOFW__SyABaaQ4KIIddRHn_t9oS3Ur5SCs",

    //   ...(OPENAI_API_TYPE === 'openai' && {
    //     Authorization: `Bearer ${key ? key : process.env.OPENAI_API_KEY}`
    //   }),
    //   ...(OPENAI_API_TYPE === 'azure' && {
    //     'api-key': `${key ? key : process.env.OPENAI_API_KEY}`
    //   }),
    //   ...((OPENAI_API_TYPE === 'openai' && OPENAI_ORGANIZATION) && {
    //     'OpenAI-Organization': OPENAI_ORGANIZATION,
    //   }),
    },
    method: 'POST',
    body: JSON.stringify({
      // ...(OPENAI_API_TYPE === 'openai' && {model: model.id}),
      model: model.id,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        ...messages,
      ],
      temperature: temperature,
      openai_api_key: "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",
    }),
  }
  const res = await fetch(url, requestData);

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
        `OpenAI API returned an error (${res.status}): ${
          decoder.decode(result?.value) || result.statusText
        }`,
      );
    }
  }
  

  const reader = res?.body?.getReader();

  if (!reader) {
    throw new Error('API Response body has no reader')
  }

  const stream = new ReadableStream({
    start(controller) {
      function push() {
        // "done" is a Boolean and value a "Uint8Array"
        reader?.read().then(({ done, value}) => {
          // If there is no more data to read
          if (done) {
            console.log("done", done);
            controller.close();
            return;
          }
          // Get the data and send it to the browser via the controller
          controller.enqueue(value);
          push();
        });
      }
      push();
    },
  })

  return stream
};