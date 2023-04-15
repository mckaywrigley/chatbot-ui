import { Message } from './chat';
import { OpenAIModel } from './openai';

import { ToolExecutionContext } from '@/agent/tools/executor';

export type Action = {
  type: 'action';
  tool: string;
  toolInput: string;
};
export type Answer = {
  type: 'answer';
  answer: string;
};
export type ReactAgentResult = Action | Answer;

export interface ToolActionResult {
  action: Action;
  result: string;
}

export interface PlanningRequest {
  model: OpenAIModel;
  messages: Message[];
  prompt: string;
  temperature: number;
  toolActionResult?: ToolActionResult;
}

export interface ExecuteToolRequest {
  model: OpenAIModel;
  input: string;
  toolAction: Action;
}

export interface Tool {
  type: 'internal' | 'remote';
  name: string;
  description: string;
  parameters: string[];
  execute?: (context: ToolExecutionContext, input: string) => Promise<string>;
}
