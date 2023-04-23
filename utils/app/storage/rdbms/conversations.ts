import { Conversation } from '@/types/chat';

export const rdbmsGetConversations = async () => {
  const response = await fetch('api/rdbms/conversations', { method: 'POST' });
  return response.json() as Promise<Conversation[]>;
};

export const rdbmsUpdateConversations = async (
  conversations: Conversation[],
) => {
  await fetch('api/rdbms/conversations', {
    method: 'PUT',
    body: JSON.stringify(conversations),
  });
};

export const rdbmsDeleteConversations = async () => {
  await fetch('api/rdbms/conversations', {
    method: 'DELETE',
  });
};
