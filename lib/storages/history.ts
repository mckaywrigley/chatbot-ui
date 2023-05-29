import { Conversation } from '@/types/chat';

export const historyGET = async () => {
  const response = await fetch('/api/history');
  const conversations = await response.json();
  return conversations;
};

export const historyPOST = async (conversations: Conversation[]) => {
  const body = conversations.map((conversation) => ({
    id: conversation.id,
    name: conversation.name,
    messages: conversation.messages,
    model: conversation.model,
    prompt: conversation.prompt,
    temperature: conversation.temperature,
    folderId: conversation.folderId,
  }));

  await fetch('/api/history', {
    method: 'POST',
    body: JSON.stringify({ conversations: body }),
  });
};

export const historyDELETE = async () => {
  await fetch('/api/history', {
    method: 'DELETE',
  });
};
