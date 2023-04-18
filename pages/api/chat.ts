import { NextApiRequest, NextApiResponse } from 'next';

import { DEFAULT_SYSTEM_PROMPT } from '@/utils/app/const';
import { OpenAIError, OpenAIStream } from '@/utils/server';
import { ensureHasValidSession } from '@/utils/server/auth';
import { getTiktokenEncoding } from '@/utils/server/tiktoken';

import { ChatBody, Message } from '@/types/chat';

import path from 'node:path';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  // Vercel Hack
  // https://github.com/orgs/vercel/discussions/1278
  // eslint-disable-next-line no-unused-vars
  const vercelFunctionHack = path.resolve('./public', '');

  if (!(await ensureHasValidSession(req, res))) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { model, messages, key, prompt, temperature } =
      (await req.body) as ChatBody;

    const encoding = await getTiktokenEncoding(model.id);

    let promptToSend = prompt;
    if (!promptToSend) {
      promptToSend = DEFAULT_SYSTEM_PROMPT;
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
      temperature,
      key,
      messagesToSend,
    );
    res.status(200);
    res.writeHead(200, {
      Connection: 'keep-alive',
      'Content-Encoding': 'none',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
      'Content-Type': 'text/event-stream',
    });
    const decoder = new TextDecoder();
    const reader = stream.getReader();
    let closed = false;
    while (!closed) {
      await reader.read().then(({ done, value }) => {
        if (done) {
          closed = true;
          res.end();
        } else {
          const text = decoder.decode(value);
          res.write(text);
        }
      });
    }
  } catch (error) {
    console.error(error);
    if (error instanceof OpenAIError) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error' });
    }
  }
};

export default handler;
