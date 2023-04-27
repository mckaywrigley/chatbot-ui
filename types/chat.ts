import { OpenAIModel } from './openai';
import { PluginID } from './plugin';

export interface Message {
  role: Role;
  content: string;
  pluginId: PluginID.LANGCHAIN_CHAT | PluginID.GPT4 | null;
}

export type Role = 'assistant' | 'user';

export interface ChatBody {
  model: OpenAIModel;
  messages: Message[];
  prompt: string;
  temperature: number;
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
