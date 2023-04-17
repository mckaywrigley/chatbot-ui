import { Plugin } from '@/types/agent';

import { ToolExecutionContext } from './executor';
import { RequestsGetTool, RequestsPostTool } from './requests';

export const createDefaultTools = (context: ToolExecutionContext): Plugin[] => {
  return [
    new RequestsGetTool(context.headers),
    new RequestsPostTool(context.headers),
  ];
};
