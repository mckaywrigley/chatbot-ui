import { Conversation } from '@/types/chat';

export const localGetConversations = () => {
  return JSON.parse(
    localStorage.getItem('conversationHistory') || '[]',
  ) as Conversation[];
};

export const localSaveConversations = (conversations: Conversation[]) => {
  localStorage.setItem('conversationHistory', JSON.stringify(conversations));
};

export const localDeleteConversations = () => {
  localStorage.removeItem('conversationHistory');
};
