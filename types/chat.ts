import { ConversationV1, ConversationV4 } from './export';
import { OpenAIModel } from './openai';

export interface Message extends SendMessage{
  id: string;
  // role: Role;
  // content: string;
  create_time: number;
}

export interface SendMessage {
  role: Role;
  content: string;
}

export type Role = 'assistant' | 'user' | 'system';

export interface ChatBody {
  model: OpenAIModel;
  messages: SendMessage[];
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
  create_time: number;
  update_time: number;
}

export type SupportedConversationFormats =
  | ConversationV1
  | ConversationV4
  | Conversation;
