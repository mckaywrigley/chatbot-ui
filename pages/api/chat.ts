import { NextRequest } from 'next/server';

import { DEFAULT_SYSTEM_PROMPT, DEFAULT_TEMPERATURE } from '@/utils/app/const';
import { OpenAIError, OpenAIStream } from '@/utils/server';

import { ChatBody, Message } from '@/types/chat';

// @ts-expect-error
import wasm from '../../node_modules/@dqbd/tiktoken/lite/tiktoken_bg.wasm?module';

import tiktokenModel from '@dqbd/tiktoken/encoders/cl100k_base.json';
import { Tiktoken, init } from '@dqbd/tiktoken/lite/init';

export const config = {
  runtime: 'edge',
};

type Doc = { title: string; content: string };

async function expandPromptWithContext(
  prompt: string,
  messages: Message[],
  req: NextRequest,
): Promise<string> {
  const context: Doc[] = await fetch(
    `${req.nextUrl.origin}/api/documentContext`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    },
  ).then((res) => res.json());

  let additions: string[] = [
    'The following are some relevant documents to use in your answer',
  ];

  for (const { title, content } of context) {
    additions.push(`Title: ${title}; Content: ${content}`);
  }

  return prompt + '\n' + additions.join('\n');
}

const handler = async (req: NextRequest): Promise<Response> => {
  try {
    const { model, messages, key, prompt, temperature } =
      (await req.json()) as ChatBody;

    // TODO: properly keep track of what people are saying
    console.log('Messages', messages);

    await init((imports) => WebAssembly.instantiate(wasm, imports));
    const encoding = new Tiktoken(
      tiktokenModel.bpe_ranks,
      tiktokenModel.special_tokens,
      tiktokenModel.pat_str,
    );

    let promptToSend =
      "You are SwizBot, a chatbot based on Swizec Teller's writings. Answer the user's questions carefully. If you are not sure, ask followup questions to clarify the user's situation. Answer as if you are Swizec Teller, using his style of writing. Respond using markdown.";

    promptToSend = await expandPromptWithContext(promptToSend, messages, req);

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
