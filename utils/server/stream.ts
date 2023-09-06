import { Message } from '@/types/chat';

import { GenerateParameters } from './schema';

import {
  ParsedEvent,
  ReconnectInterval,
  createParser,
} from 'eventsource-parser';

export const LLMStream = async (
  systemPrompt: string,
  parameters: GenerateParameters,
  messages: Message[],
) => {
  let url = `${process.env.MODEL_ENDPOINT}/generate_stream`;

  const res = await fetch(url, {
    method: 'POST',
    body: JSON.stringify({
      inputs: generatePrompt(messages, systemPrompt),
      parameters,
    }),
  });

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  if (res.status !== 200) {
    const result = await res.json();
    if (result.error) {
      throw new Error(result.error);
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

const generatePrompt = (messages: Message[], systemPrompt?: string) => {
  const prompt = messages
    .map((message) =>
      message.role === 'user'
        ? `[INST] ${message.content} [/INST]`
        : `${message.content}`,
    )
    .join('\n');

  if (systemPrompt) {
    return `[/INST] <<SYS>> ${systemPrompt} <</SYS>> [/INST] \n ${prompt}`;
  }

  return prompt;
};
