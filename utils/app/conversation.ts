import { Conversation } from '@/types/chat';

import dayjs from 'dayjs';

export const getNonDeletedCollection = (collection: any[]): any[] =>
  collection.filter((c) => !c.deleted);

export const updateConversation = (
  updatedConversation: Conversation,
  allConversations: Conversation[],
) => {
  const updatedConversations = allConversations.map((c) => {
    if (c.id === updatedConversation.id) {
      return {
        ...updatedConversation,
        lastUpdateAtUTC: dayjs().valueOf(),
      };
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

export const updateConversationLastUpdatedAtTimeStamp = () => {
  localStorage.setItem(
    'conversationLastUpdatedAt',
    dayjs().valueOf().toString(),
  );
};

export const saveConversation = (conversation: Conversation) => {
  localStorage.setItem('selectedConversation', JSON.stringify(conversation));
};

export const saveConversations = (conversations: Conversation[]) => {
  localStorage.setItem('conversationHistory', JSON.stringify(conversations));
};
