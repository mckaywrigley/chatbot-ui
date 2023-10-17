export enum Model {
  PhindCodeLlamaV2 = 'PhindCodeLlamaV2',
  SlitherSolAuditor = 'SlitherSolAuditor',
}

export interface Message {
  role: Role;
  content: string;
}

export type Role = 'assistant' | 'user';

export interface ChatBody {
  messages: Message[];
  prompt: string;
  temperature: number;
}

export interface Conversation {
  id: string;
  name: string;
  messages: Message[];
  prompt: string;
  temperature: number;
  folderId: string | null;
  modelId: Model;
}
