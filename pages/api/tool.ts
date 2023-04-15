import { DEFAULT_SYSTEM_PROMPT, DEFAULT_TEMPERATURE } from '@/utils/app/const';
import { OpenAIError, OpenAIStream } from '@/utils/server';

import {
  ExecuteToolRequest,
  PlanningRequest,
  ToolActionResult,
} from '@/types/agent';
import { Message } from '@/types/chat';

// @ts-expect-error
import wasm from '../../node_modules/@dqbd/tiktoken/lite/tiktoken_bg.wasm?module';

import { createContext, executeTool } from '@/agent/tools/executor';
import tiktokenModel from '@dqbd/tiktoken/encoders/cl100k_base.json';
import { Tiktoken, init } from '@dqbd/tiktoken/lite/init';
import { initializeAgentExecutor } from 'langchain/agents';

export const config = {
  runtime: 'edge',
};

const handler = async (req: Request): Promise<Response> => {
  try {
    const { model, input, toolAction } =
      (await req.json()) as ExecuteToolRequest;

    const context = createContext(req);
    const toolResult = await executeTool(context, toolAction);
    const result: ToolActionResult = {
      action: toolAction,
      result: toolResult,
    };

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
