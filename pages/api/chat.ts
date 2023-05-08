import { DEFAULT_SYSTEM_PROMPT, DEFAULT_TEMPERATURE } from '@/utils/app/const';
import { OpenAIError, OpenAIStream } from '@/utils/server';
import { readEmbeddingsFromCSV } from '@/utils/server/embeddingsCsv';

import { ChatBody, Message } from '@/types/chat';

// @ts-expect-error
import wasm from '../../node_modules/@dqbd/tiktoken/lite/tiktoken_bg.wasm?module';

import tiktokenModel from '@dqbd/tiktoken/encoders/cl100k_base.json';
import { Tiktoken, init } from '@dqbd/tiktoken/lite/init';
// @ts-expect-error
import cosineSimilarity from 'compute-cosine-similarity';
import { Configuration, OpenAIApi } from 'openai';

export const config = {
  runtime: 'edge',
};

const openai = new OpenAIApi(
  new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  }),
);

async function getEmbedding(input: string) {
  const embedding = await openai.createEmbedding({
    model: 'text-embedding-ada-002',
    input,
  });

  return embedding.data.data[0].embedding;
}

async function findRelevantSections(question: string) {
  const questionEmbedding = await getEmbedding(question);
  // similarity key gets rewritten
  const haystack = await readEmbeddingsFromCSV();

  for (const item of haystack) {
    item.similarity = cosineSimilarity(questionEmbedding, item.embedding);
  }

  haystack.sort((a, b) => b.similarity - a.similarity);

  return haystack.slice(0, 10);
}

const handler = async (req: Request): Promise<Response> => {
  try {
    const { model, messages, key, prompt, temperature } =
      (await req.json()) as ChatBody;

    console.log({ model, messages, key, prompt, temperature });

    await init((imports) => WebAssembly.instantiate(wasm, imports));
    const encoding = new Tiktoken(
      tiktokenModel.bpe_ranks,
      tiktokenModel.special_tokens,
      tiktokenModel.pat_str,
    );

    let promptToSend = prompt;
    if (!promptToSend) {
      promptToSend = DEFAULT_SYSTEM_PROMPT;
    }

    const userQuestion = messages.find((m) => m.role == 'user');
    if (userQuestion) {
      const relevantSections = await findRelevantSections(userQuestion.content);

      console.log(relevantSections);
    }

    let temperatureToUse = temperature;
    if (temperatureToUse == null) {
      temperatureToUse = DEFAULT_TEMPERATURE;
    }

    const prompt_tokens = encoding.encode(promptToSend);

    let tokenCount = prompt_tokens.length;
    let messagesToSend: Message[] = [];

    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      const tokens = encoding.encode(message.content);

      if (tokenCount + tokens.length + 1000 > model.tokenLimit) {
        break;
      }
      tokenCount += tokens.length;
      messagesToSend = [message, ...messagesToSend];
    }

    encoding.free();

    const stream = await OpenAIStream(
      model,
      promptToSend,
      temperatureToUse,
      key,
      messagesToSend,
    );

    return new Response(stream);
  } catch (error) {
    console.error(error);
    if (error instanceof OpenAIError) {
      return new Response('Error', { status: 500, statusText: error.message });
    } else {
      return new Response('Error', { status: 500 });
    }
  }
};

export default handler;
