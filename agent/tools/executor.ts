import { Action } from '@/types/agent';

import { tools } from './index';

export interface ToolExecutionContext {
  locale: string;
}

export const createContext = (request: Request): ToolExecutionContext => {
  const locale = request.headers.get('accept-language')?.split(',')[0] || 'en';
  return {
    locale,
  };
};

export const executeTool = (
  context: ToolExecutionContext,
  action: Action,
): Promise<string> => {
  const tool = tools.find((tool) => tool.name === action.tool);
  if (!tool) {
    throw new Error(`Tool not found: ${action.tool}`);
  }
  if (tool.execute) {
    return tool.execute(context, action.toolInput);
  }
  throw new Error(`invalid tool: ${action.tool}`);
};
