import { User } from '@/types/auth';
import { Conversation } from '@/types/chat';

export const localGetConversations = (user: User) => {
  const itemName = `conversationHistory-${user.id}`;
  return JSON.parse(localStorage.getItem(itemName) || '[]') as Conversation[];
};

export const localSaveConversations = (
  user: User,
  conversations: Conversation[],
) => {
  const itemName = `conversationHistory-${user.id}`;
  localStorage.setItem(itemName, JSON.stringify(conversations));
};

export const localDeleteConversations = (user: User) => {
  const itemName = `conversationHistory-${user.id}`;
  localStorage.removeItem(itemName);
};
