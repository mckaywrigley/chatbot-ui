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

const handler = async (req: Request): Promise<Response> => {
  const globalLogFields: Record<string, string> = {};

  if (typeof req !== 'undefined') {
    const traceHeader = req.headers.get('X-Cloud-Trace-Context');
      if (traceHeader && Boolean(process.env.GCP_PROJECT)) {
      const [trace] = traceHeader.split('/');
      globalLogFields[
        'logging.googleapis.com/trace'
      ] = `projects/${process.env.GCP_PROJECT}/traces/${trace}`;
    }
  }

  try {
    const { model, messages, key, prompt, temperature } = (await req.json()) as ChatBody;

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

    const stream = await OpenAIStream(model, promptToSend, temperatureToUse, key, messagesToSend);

    return new Response(stream);
  } catch (error) {
    let msg = null;

    if (error instanceof OpenAIError) {
      console.error(JSON.stringify(Object.assign(
        {
          severity: 'ERROR',
          message: error.message,
          name: error.name,
          type: error.type,
          param: error.param,
          code: error.code,
        },
        globalLogFields
      )));
      msg = error.message;
    } else {
      console.error(JSON.stringify(Object.assign(
        { severity: 'ERROR', message: error, },
        globalLogFields
      )));
      msg = "Internal Server Error";
    }

    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { 'Content-Type': 'application/json' }},
    );
  }
};

export default handler;
