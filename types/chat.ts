import { OpenAIModel } from './openai';

export interface PluginNameLogo {
  name: string;
  logo: string;
}

export interface Message {
  role: Role;
  content: string;
  pluginIdNameLogoMap?: Record<string, PluginNameLogo>;
  requestToPlugin?: string;
  responseFromPlugin?: string;
}

export type Role = 'assistant' | 'user';

export interface ChatBody {
  model: OpenAIModel;
  messages: Message[];
  key: string;
  prompt: string;
  temperature: number;
  pluginUrlList?: string[];
}

export interface Conversation {
  id: string;
  name: string;
  messages: Message[];
  model: OpenAIModel;
  prompt: string;
  temperature: number;
  folderId: string | null;
}
