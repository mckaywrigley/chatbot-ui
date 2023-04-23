import { Conversation } from '@/types/chat';

export const rdbmsCreateConversation = async (
  newConversation: Conversation,
) => {
  await fetch('api/rdbms/conversation', {
    method: 'POST',
    body: JSON.stringify(newConversation),
  });
};

export const rdbmsUpdateConversation = async (
  updatedConversation: Conversation,
) => {
  await fetch('api/rdbms/conversation', {
    method: 'PUT',
    body: JSON.stringify(updatedConversation),
  });
};

export const rdbmsDeleteConversation = async (conversationId: string) => {
  await fetch('api/rdbms/conversation', {
    method: 'DELETE',
    body: JSON.stringify({ conversation_id: conversationId }),
  });
};
