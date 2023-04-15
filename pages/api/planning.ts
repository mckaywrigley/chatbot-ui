import { OpenAIError } from '@/utils/server';

import { PlanningRequest } from '@/types/agent';

import { executeReactAgent } from '@/agent/agent';

export const config = {
  runtime: 'edge',
};

const handler = async (req: Request): Promise<Response> => {
  try {
    const { model, messages, prompt, temperature, toolActionResult } =
      (await req.json()) as PlanningRequest;

    const lastMessage = messages[messages.length - 1];
    const result = await executeReactAgent(
      lastMessage.content,
      toolActionResult,
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
