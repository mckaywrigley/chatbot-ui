import { Message } from './chat';
import { OpenAIModel } from './openai';

import { ToolExecutionContext } from '@/agent/tools/executor';

export type Action = {
  type: 'action';
  thought: string;
  tool: ToolSummary;
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
  messages: Message[];
  enabledToolNames: string[];
  toolActionResults: ToolActionResult[];
}

export interface ExecuteToolRequest {
  model: OpenAIModel;
  input: string;
  toolAction: Action;
}

export interface ToolDefinitionApi {
  type: string;
  url: string;
  hasUserAuthentication: boolean;
}

export interface ToolAuth {
  type: string;
}
export interface Tool {
  nameForHuman: string;
  nameForModel: string;
  descriptionForModel: string;
  descriptionForHuman: string;
  execute?: (context: ToolExecutionContext, input: string) => Promise<string>;
  api?: ToolDefinitionApi;
  apiSpec?: string;
  auth?: ToolAuth;
  logoUrl?: string;
  contactEmail?: string;
  legalInfoUrl?: string;
  displayForUser: boolean;
}

export interface PluginTool extends Tool {
  api: ToolDefinitionApi;
  apiSpec: string;
  auth: ToolAuth;
}

export interface ToolSummary {
  nameForHuman: string;
  nameForModel: string;
  descriptionForModel: string;
  descriptionForHuman: string;
  displayForUser: boolean;
  logoUrl?: string;
}
