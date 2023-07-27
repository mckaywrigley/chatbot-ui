export interface Message {
  role: Role;
  content: string;
}

export type Role = 'system' | 'assistant' | 'user';

export interface ChatBody {
  messages: Message[];
  key: string;
  prompt: string;
  plugins: string[];
  api: string;
}

export interface Conversation {
  id: string;
  name: string;
  messages: Message[];
  prompt: string;
  temperature: number;
  folderId: string | null;
}
