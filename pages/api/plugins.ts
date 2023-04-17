import { NextApiRequest, NextApiResponse } from 'next';

import { OpenAIError } from '@/utils/server';

import { listTools } from '@/agent/plugins/list';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const tools = await listTools();
    res.status(200).json(tools);
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
