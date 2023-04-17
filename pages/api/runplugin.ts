import { NextApiRequest, NextApiResponse } from 'next';

import { OpenAIError } from '@/utils/server';

import { ExecuteToolRequest, PluginResult } from '@/types/agent';

import { createContext, executeTool } from '@/agent/plugins/executor';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const {
      model,
      input,
      action: toolAction,
    } = (await req.body) as ExecuteToolRequest;
    const context = createContext(req);
    const toolResult = await executeTool(context, toolAction);
    const result: PluginResult = {
      action: toolAction,
      result: toolResult,
    };

    res.status(200).json(result);
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
