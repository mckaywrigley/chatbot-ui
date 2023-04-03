import { ConversationV1, ConversationV4 } from './export';
import { OpenAIModel } from './openai';

export interface Message {
  role: Role;
  content: string;
}

export type Role = 'assistant' | 'user' | 'system';

export interface ChatBody {
  model: OpenAIModel;
  messages: Message[];
  key: string;
  prompt: string;
}

export interface ChatNode {
  id: string;
  message: Message;
  parentMessageId?: string;
  children: string[];
}

export interface Conversation {
  id: string;
  name: string;
  model: OpenAIModel;
  prompt: string;
  folderId: string | null;
  mapping: Record<string, ChatNode>;
  current_node: string;
}

export type SupportedConversationFormats =
  | ConversationV1
  | ConversationV4
  | Conversation;
