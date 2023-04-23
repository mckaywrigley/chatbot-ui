import { Conversation } from '@/types/chat';

export const getSelectedConversation = () => {
  return localStorage.getItem('selectedConversation');
};

export const saveSelectedConversation = (conversation: Conversation) => {
  localStorage.setItem('selectedConversation', JSON.stringify(conversation));
};

export const deleteSelectedConversation = () => {
  localStorage.removeItem('selectedConversation');
};
