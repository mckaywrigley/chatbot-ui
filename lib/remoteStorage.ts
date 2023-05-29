import { Conversation } from '@/types/chat';

class RemoteStorage {
  async getItem(key: string) {
    if (key === 'conversationHistory') {
      return await this.conversationHistoryGET();
    }
  }

  async setItem(key: string, value: Conversation[]) {
    if (key === 'conversationHistory') {
      await this.conversationHistoryPOST(value);
    }
  }

  async removeItem(key: string) {
    if (key === 'conversationHistory') {
      await this.conversationHistoryDELETE();
    }
  }

  async conversationHistoryGET() {
    const response = await fetch('/api/conversation-history');
    const conversations = await response.json();
    return conversations;
  }

  async conversationHistoryPOST(conversations: Conversation[]) {
    const body = conversations.map((conversation) => ({
      id: conversation.id,
      name: conversation.name,
      messages: conversation.messages,
      model: conversation.model,
      prompt: conversation.prompt,
      temperature: conversation.temperature,
      folderId: conversation.folderId,
    }));

    await fetch('/api/conversation-history', {
      method: 'POST',
      body: JSON.stringify({ conversations: body }),
    });
  }

  async conversationHistoryDELETE() {
    await fetch('/api/conversation-history', {
      method: 'DELETE',
    });
  }
}

const remoteStorage = new RemoteStorage();

export default remoteStorage;
