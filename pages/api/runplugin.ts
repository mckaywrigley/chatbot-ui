import { NextApiRequest, NextApiResponse } from 'next';

import { OpenAIError } from '@/utils/server';
import { getTiktokenEncoding } from '@/utils/server/tiktoken';

import { PluginResult, RunPluginRequest } from '@/types/agent';

import { createContext, executeTool } from '@/agent/plugins/executor';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const {
      taskId,
      model,
      action: toolAction,
    } = (await req.body) as RunPluginRequest;
    const encoding = await getTiktokenEncoding(model?.id || 'gpt-3.5-turbo');
    const context = createContext(req, encoding, model);
    try {
      const toolResult = await executeTool(context, toolAction);
      const result: PluginResult = {
        action: toolAction,
        result: toolResult,
      };
      res.status(200).json(result);
    } finally {
      encoding.free();
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
