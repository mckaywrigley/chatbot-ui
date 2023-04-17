import { OpenAIError } from '@/utils/server';

import { PlanningRequest } from '@/types/agent';

import { executeNotConversationalReactAgent } from '@/agent/agent';
import { createContext } from '@/agent/tools/executor';

export const config = {
  runtime: 'edge',
};

const handler = async (req: Request): Promise<Response> => {
  try {
    const { messages, enabledToolNames, toolActionResults } =
      (await req.json()) as PlanningRequest;

    const lastMessage = messages[messages.length - 1];
    const context = createContext(req);
    /*
    const result = await executeReactAgent(
      context,
      enabledToolNames,
      lastMessage.content,
      toolActionResult,
    );
    */
    const result = await executeNotConversationalReactAgent(
      context,
      enabledToolNames,
      lastMessage.content,
      toolActionResults,
    );
    return new Response(JSON.stringify(result), {
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
