import { NextApiRequest } from 'next';

import { extractHeaders } from '@/utils/server/http';

import { Action } from '@/types/agent';
import { OpenAIModel } from '@/types/openai';

import { listAllTools } from './list';
import { Headers } from './requests';

import { Tiktoken } from '@dqbd/tiktoken';

export interface ToolExecutionContext {
  locale: string;
  headers: Headers;
  model?: OpenAIModel;
  encoding: Tiktoken;
}

export const createContext = (
  request: Request | NextApiRequest,
  encoding: Tiktoken,
  model: OpenAIModel,
): ToolExecutionContext => {
  const headers = extractHeaders(request);
  const locale = headers['accept-language']?.split(',')[0] || 'en';
  return {
    headers,
    locale,
    encoding,
    model,
  };
};

export const executeTool = async (
  context: ToolExecutionContext,
  action: Action,
): Promise<string> => {
  const tools = await listAllTools(context);
  const tool = tools.find(
    (tool) => tool.nameForModel === action.plugin.nameForModel,
  );
  if (!tool) {
    throw new Error(`Tool not found: ${action.plugin}`);
  }
  if (tool.execute) {
    return tool.execute(context, action.pluginInput);
  }
  throw new Error(`invalid tool: ${action.plugin}`);
};
