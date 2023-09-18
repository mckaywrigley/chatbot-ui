import { Message } from '@/types/chat';

import { GenerateParameters, Status, statusSchema } from './schema';

export const LLMStream = async (
  systemPrompt: string,
  parameters: GenerateParameters,
  messages: Message[],
) => {
  const runID = await getNewRunID(systemPrompt, parameters, messages);

  let previousStreamResult: {
    status: Status;
    stream: string[];
  } = {
    status: statusSchema.Enum.UNINITIALIZED,
    stream: [],
  };

  const stream = new ReadableStream({
    async pull(controller) {
      while (true) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const { status, stream } = await getStream(runID);

        // New chunks are the difference between the current stream and the previous stream
        const newChunks = stream.slice(
          previousStreamResult.stream.length,
          stream.length,
        );

        // If there are new chunks, send them to the client
        if (newChunks.length > 0) {
          const joinedChunks = newChunks.join('');
          controller.enqueue(new TextEncoder().encode(joinedChunks));
        }

        previousStreamResult = { status, stream };

        // If the status is 'COMPLETED', close the stream
        if (status === 'COMPLETED') {
          controller.close();
          break;
        }
      }
    },
  });

  return stream;
};

const getStream = async (runID: string) => {
  const url = `https://api.runpod.ai/v2/${process.env.ENDPOINT_ID}/stream/${runID}`;

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
  return { ...result, stream: result.stream.map((s) => s.output) };
};

const getNewRunID = async (
  systemPrompt: string,
  parameters: GenerateParameters,
  messages: Message[],
) => {
  const url = `https://api.runpod.ai/v2/${process.env.ENDPOINT_ID}/run`;

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
        stream: true,
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
    return `[/INST] <<SYS>> ${systemPrompt} <</SYS>> [/INST] \n ${prompt}`;
  }

  return prompt;
};
