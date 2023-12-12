import { DEFAULT_SYSTEM_PROMPT, DEFAULT_TEMPERATURE } from '@/utils/app/const';
import { OpenAIError, OpenAIStream } from '@/utils/server';

import { ChatBody, Message } from '@/types/chat';
import { OpenAIModelID, OpenAIModels } from '@/types/openai';

import {
  TiktokenModel,
  getEncoding,
  getEncodingNameForModel,
} from 'js-tiktoken';

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
    const { model, messages, key, prompt, temperature } =
      (await req.json()) as ChatBody;

    const { tokenLimit, messageTokens } =
      OpenAIModels[model.id as OpenAIModelID];

    const encodingForModel = getEncodingNameForModel(model.id as TiktokenModel);
    const encoding = getEncoding(encodingForModel);

    let promptToSend = prompt;
    if (!promptToSend) {
      promptToSend = DEFAULT_SYSTEM_PROMPT;
    }

    let temperatureToUse = temperature;
    if (temperatureToUse == null) {
      temperatureToUse = DEFAULT_TEMPERATURE;
    }

    let tokenCount = encoding.encode(promptToSend).length;
    tokenCount += 3; // reply starts with <|start|>assistant<|end|>
    tokenCount += 5; // We're off by 5. Unsure why.

    let messagesToSend: Message[] = [];

    const maxReplyTokens = 1000; // hardcoded in utils/server
    // I think we're calculating this correctly, but if we're off, it's by a
    // _lot_ less than 100.
    const safetyMargin = 100;

    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];

      const msgTokenCount =
        messageTokens +
        encoding.encode(message.content).length +
        encoding.encode(message.role).length;

      if (
        tokenCount + msgTokenCount + maxReplyTokens + safetyMargin >
        tokenLimit
      ) {
        break;
      }
      tokenCount += msgTokenCount;
      messagesToSend = [message, ...messagesToSend];
    }

    const stream = await OpenAIStream(
      model,
      promptToSend,
      temperatureToUse,
      key,
      messagesToSend,
    );

    return new Response(stream);
  } catch (error) {
    let msg = null;

    if (error instanceof OpenAIError) {
      console.error(
        JSON.stringify(
          Object.assign(
            {
              severity: 'ERROR',
              message: error.message,
              name: error.name,
              type: error.type,
              param: error.param,
              code: error.code,
            },
            globalLogFields,
          ),
        ),
      );
      msg = error.message;
    } else {
      console.error(
        JSON.stringify(
          Object.assign(
            { severity: 'ERROR', message: String(error) },
            globalLogFields,
          ),
        ),
      );
      msg = 'Internal Server Error';
    }

    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export default handler;
