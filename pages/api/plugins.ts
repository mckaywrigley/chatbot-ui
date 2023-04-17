import { OpenAIError } from '@/utils/server';

import { ExecuteToolRequest, PluginResult } from '@/types/agent';

import { createContext, executeTool } from '@/agent/plugins/executor';
import { listTools } from '@/agent/plugins/list';

export const config = {
  runtime: 'edge',
};

const handler = async (req: Request): Promise<Response> => {
  try {
    const context = createContext(req);
    const tools = await listTools();
    return new Response(JSON.stringify(tools), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
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
