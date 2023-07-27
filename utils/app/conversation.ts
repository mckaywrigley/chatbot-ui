import { Conversation } from '@/types/chat';
import { cleanConversationHistory } from './clean';

export const updateConversation = (
  updatedConversation: Conversation,
  allConversations: Conversation[],
) => {
  const updatedConversations = allConversations.map((c) => {
    if (c.id === updatedConversation.id) {
      return updatedConversation;
    }

    return c;
  });

  saveConversation(updatedConversation);
  saveConversations(updatedConversations);

  return {
    single: updatedConversation,
    all: updatedConversations,
  };
};

export const saveConversation = (conversation: Conversation) => {
  localStorage.setItem('selectedConversation', JSON.stringify(conversation));
};

export const saveConversations = (conversations: Conversation[]) => {
  localStorage.setItem('conversationHistory', JSON.stringify(conversations));
};

export const getConversationHistory = () => {
  const conversationHistory = localStorage.getItem('conversationHistory');
  if (conversationHistory) {
    const parsedConversationHistory: Conversation[] =
      JSON.parse(conversationHistory);
    const cleanedConversationHistory = cleanConversationHistory(
      parsedConversationHistory,
    );

    saveConversations(cleanedConversationHistory);

    return cleanedConversationHistory;
  }

  return [];
}
