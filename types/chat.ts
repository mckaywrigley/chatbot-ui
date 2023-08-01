import { OpenAIModel } from './openai';
import { PrivateAIModel } from './privateIA';

export interface Message {
  role: Role;
  content: string;
}

export type Role = 'assistant' | 'user';

export interface ChatBody {
  model: OpenAIModel | PrivateAIModel;
  messages: Message[];
  key: string;
  prompt: string;
  temperature: number;
}

export interface Conversation {
  id: string;
  name: string;
  messages: Message[];
  model: OpenAIModel | PrivateAIModel;
  prompt: string;
  temperature: number;
  folderId: string | null;
}
