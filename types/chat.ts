import { OpenAIModel } from './openai';

export interface Message {
  id: string;
  role: Role;
  content: string;
}

export type Role = 'assistant' | 'user';

export interface ChatBody {
  id: string;
  model: OpenAIModel;
  messages: Message[];
  key: string;
  prompt: string;
  temperature: number;
  userName:string;
  ip:string;
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
