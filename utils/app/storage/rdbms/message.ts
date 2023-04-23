import { Message } from '@/types/chat';

export const rdbmsCreateMessage = async (
  conversationId: string,
  newMessage: Message,
) => {
  await fetch('api/rdbms/message', {
    method: 'POST',
    body: JSON.stringify({
      message: newMessage,
      conversation_id: conversationId,
    }),
  });
};

export const rdbmsUpdateMessage = async (
  conversationId: string,
  updatedMessage: Message,
) => {
  await fetch('api/rdbms/message', {
    method: 'PUT',
    body: JSON.stringify({
      message: updatedMessage,
      conversation_id: conversationId,
    }),
  });
};

export const rdbmsDeleteMessage = async (messageId: string) => {
  await fetch('api/rdbms/message', {
    method: 'DELETE',
    body: JSON.stringify({ message_id: messageId }),
  });
};
