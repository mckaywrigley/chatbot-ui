import { OpenAIModel } from './openai';

export interface Message {
  role: Role;
  content: Content[];
}

export interface Content{
  type: string;
  text?: string;
  image_url?: ImageUrl;
}

export interface ImageUrl{
  url: string;
}

export type Role = 'assistant' | 'user';

export interface ChatBody {
  model: OpenAIModel;
  messages: Message[];
  key: string;
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
