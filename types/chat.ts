import { OpenAIModel } from './openai';

export interface Source {
  AUTHORS: string;
  SIMSCORE: number;
  TITLE: string;
  TYPE: string;
  YEAR: number;
}

export interface Message {
  role: Role;
  content: string;
  sources?: Source[];
}

export type Role = 'assistant' | 'user';

export interface ChatBody {
  id?: string;
  model?: OpenAIModel;
  messages: Message[];
  key: string;
  prompt?: string;
  temperature?: number;
}

export interface Conversation {
  id: string;
  name: string;
  messages: Message[];
  model?: OpenAIModel;
  prompt?: string;
  temperature?: number;
  folderId: string | null;
}
