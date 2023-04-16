import { OpenAIModel } from './openai';

export interface Message {
  role: Role;
  content: string;
}

export type Role = 'assistant' | 'user';

export interface ChatBody {
  model: OpenAIModel;
  messages: Message[];
  key: string;
  prompt: string;
  temperature: number;
  googleAPIKey?: string;
  googleCSEId?: string;
}

export interface ChatModeRunner {
  run: (params: ChatPluginParams) => void;
}

export interface ChatPluginParams {
  body: ChatBody;
  message: Message;
  conversation: Conversation;
  selectedConversation: Conversation;
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
