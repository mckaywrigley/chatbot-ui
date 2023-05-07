import { User } from 'chatbot-ui-core/types/auth';
import { Conversation } from 'chatbot-ui-core/types/chat';

export const getSelectedConversation = (user: User) => {
  const itemName = `selectedConversation-${user.id}`;
  return localStorage.getItem(itemName);
};

export const saveSelectedConversation = (
  user: User,
  conversation: Conversation,
) => {
  const itemName = `selectedConversation-${user.id}`;
  localStorage.setItem(itemName, JSON.stringify(conversation));
};

export const deleteSelectedConversation = (user: User) => {
  const itemName = `selectedConversation-${user.id}`;
  localStorage.removeItem(itemName);
};
