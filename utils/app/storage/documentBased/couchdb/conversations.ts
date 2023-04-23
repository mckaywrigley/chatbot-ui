import { Conversation } from '@/types/chat';

export const couchdbGetConversations = async () => {
  const response = await fetch('api/conversations');
  return response.json() as Promise<Conversation[]>;
};

export const couchdbSaveConversations = async (
  conversations: Conversation[],
) => {
  await fetch('api/conversations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(conversations),
  });
};
