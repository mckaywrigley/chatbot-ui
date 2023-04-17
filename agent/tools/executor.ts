import { NextApiRequest } from 'next';

import { extractHeaders } from '@/utils/server/http';

import { Action } from '@/types/agent';

import { createDefaultTools } from './index';
import { listTools } from './list';
import { Headers } from './requests';

export interface ToolExecutionContext {
  locale: string;
  headers: Headers;
}

export const createContext = (
  request: Request | NextApiRequest,
): ToolExecutionContext => {
  const headers = extractHeaders(request);
  const locale = headers['accept-language']?.split(',')[0] || 'en';
  return {
    headers,
    locale,
  };
};

export const executeTool = async (
  context: ToolExecutionContext,
  action: Action,
): Promise<string> => {
  const defaultTools = createDefaultTools(context);
  const additionalTools = await listTools();
  const tools = [...defaultTools, ...additionalTools];
  const tool = tools.find(
    (tool) => tool.nameForModel === action.tool.nameForModel,
  );
  if (!tool) {
    throw new Error(`Tool not found: ${action.tool}`);
  }
  if (tool.execute) {
    return tool.execute(context, action.toolInput);
  }
  throw new Error(`invalid tool: ${action.tool}`);
};
