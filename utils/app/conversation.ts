import { Conversation } from '@/types/chat';

export const updateConversation = (
  databaseType: string,
  updatedConversation: Conversation,
  allConversations: Conversation[],
) => {
  const updatedConversations = allConversations.map((c) => {
    if (c.id === updatedConversation.id) {
      return updatedConversation;
    }

    return c;
  });

  saveSelectedConversation(updatedConversation);
  saveConversations(databaseType, updatedConversations);

  return {
    single: updatedConversation,
    all: updatedConversations,
  };
};

export const getSelectedConversation = () => {
  return localStorage.getItem('selectedConversation');
};

export const getConversations = async (databaseType: string) => {
  if (databaseType === 'couchdb'){
    const response = await fetch('api/conversations');
    return response.json() as Promise<Conversation[]>;
  }
  return JSON.parse(localStorage.getItem('conversationHistory') || '[]') as Conversation[];
};

export const saveSelectedConversation = (conversation: Conversation) => {
  localStorage.setItem('selectedConversation', JSON.stringify(conversation));
};

export const saveConversations = async (databaseType: string, conversations: Conversation[]) => {
  if (databaseType === 'couchdb'){
    const response = await fetch('api/conversations',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(conversations),
      }
    );
    return response.json();
  }
  localStorage.setItem('conversationHistory', JSON.stringify(conversations));
};

export const deleteSelectedConversation = () => {
  localStorage.removeItem('selectedConversation');
};

export const deleteConversations = async (databaseType: string) => {
  if (databaseType === 'couchdb'){
    const response = await fetch('api/conversations',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([]),
      }
    );
    return response.json();
  }
  localStorage.removeItem('conversationHistory');
};
