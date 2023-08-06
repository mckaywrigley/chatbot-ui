import type { ChatNode } from '@/types/chat';

export type ConversationUpdate = {
  messageList: ChatNode[];
  current_node: string;
};

export enum SendAction {
  SEND = 'SEND',
  EDIT = 'EDIT',
  REGENERATE = 'REGENERATE',
}
