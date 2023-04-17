import { Plugin } from '@/types/agent';

import { ToolExecutionContext } from './executor';
import {
  RequestsGetTool,
  RequestsGetWebpageTool,
  RequestsPostTool,
  RequestsPostWebpageTool,
} from './requests';

export const createApiTools = (context: ToolExecutionContext): Plugin[] => {
  return [
    new RequestsGetTool(context.headers),
    new RequestsPostTool(context.headers),
  ];
};

export const createWebpageTools = (context: ToolExecutionContext): Plugin[] => {
  return [
    new RequestsGetWebpageTool(context.headers),
    new RequestsPostWebpageTool(context.headers),
  ];
};
