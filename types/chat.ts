import { OpenAIModel } from './openai';

export interface Message {
  role: Role;
  content: string;
  name?: string;
  function_call?: {
    name?: string;
    arguments?: string;
  };
}

export type Role = 'user' | 'assistant' | 'function';

export interface ChatBody {
  model: OpenAIModel;
  messages: Message[];
  key: string;
  prompt: string;
  temperature: number;
  functions: unknown[];
  function_call: 'none' | 'auto' | { name: string };
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
