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

  const { model, messages, key, prompt, temperature } =
    (await req.body) as ChatBody;
  const encoding = await getTiktokenEncoding(model.id);
  try {
    let systemPromptToSend = prompt;
    if (!systemPromptToSend) {
      systemPromptToSend = DEFAULT_SYSTEM_PROMPT;
    }

    const systemPromptTokens = encoding.encode(systemPromptToSend);

    let totalToken = systemPromptTokens.length;
    let messagesToSend: Message[] = [];
    const reservedForAnswer = 1000;
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      const contentLength = encoding.encode(message.content).length;
      if (totalToken + contentLength + reservedForAnswer > model.tokenLimit) {
        break;
      }
      totalToken += contentLength;
      messagesToSend = [message, ...messagesToSend];
    }
    if (messagesToSend.length === 0) {
      throw new Error('message is too long');
    }
    const maxToken = model.tokenLimit - totalToken;
    const stream = await OpenAIStream(
      model,
      systemPromptToSend,
      temperature,
      key,
      messagesToSend,
      maxToken,
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
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error' });
    }
  } finally {
    encoding.free();
  }
};

export default handler;
