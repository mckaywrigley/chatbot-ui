import { Message } from '@/types/chat';

import { GenerateParameters, Status, statusSchema } from './schema';

const BASE_URL = 'https://api.runpod.ai/v2/';

export const LLMStream = async (
  systemPrompt: string,
  parameters: GenerateParameters,
  messages: Message[],
) => {
  const runID = await getNewRunID(systemPrompt, parameters, messages);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async pull(controller) {
      while (true) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        const { status, stream } = await getStream(runID);

        // If there are new chunks, send them to the client
        if (stream.length > 0) {
          const joinedChunks = stream.join('');
          controller.enqueue(encoder.encode(joinedChunks));
        }

        // If the status is 'COMPLETED', close the stream
        if (status === statusSchema.enum.COMPLETED) {
          controller.close();
          break;
        }
      }
    },
    cancel() {
      const res = cancelRun(runID);
      console.log('🦀 Canceled the run: ', res);
    },
  });

  return stream;
};

const cancelRun = async (runID: string) => {
  const url = `${BASE_URL}${process.env.ENDPOINT_ID}/cancel/${runID}`;

  const runResult = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.API_KEY}`,
    },
  });

  const { status } = (await runResult.json()) as { status: Status };

  return status;
};

const getStream = async (runID: string) => {
  const url = `${BASE_URL}${process.env.ENDPOINT_ID}/stream/${runID}`;

  const streamResult = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.API_KEY}`,
    },
  });

  const result = (await streamResult.json()) as {
    status: Status;
    stream: { output: string }[];
  };

  console.log('🦀 Stream result: ', result);

  return { ...result, stream: result.stream.map((s) => s.output) };
};

const getNewRunID = async (
  systemPrompt: string,
  parameters: GenerateParameters,
  messages: Message[],
) => {
  const url = `${BASE_URL}${process.env.ENDPOINT_ID}/run`;

  const runResult = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.API_KEY}`,
    },
    body: JSON.stringify({
      input: {
        prompt: generatePrompt(messages, systemPrompt),
        ...parameters,
      },
    }),
  });

  const { id } = (await runResult.json()) as { id: string; status: Status };

  return id;
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
    return `[/INST] <<SYS>> ${systemPrompt} <</SYS>> [/INST]\n${prompt}`;
  }

  return prompt;
};
