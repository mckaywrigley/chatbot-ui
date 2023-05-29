class RemoteStorage {
  async setItem(key: string, value: object) {
    if (key === 'conversationHistory') {
      await this.conversationHistory(value);
    }
  }

  async conversationHistory(conversations: object) {
    await fetch('/api/conversation-history', {
      method: 'POST',
      body: JSON.stringify({ conversations }),
    });
  }
}

const remoteStorage = new RemoteStorage();

export default remoteStorage;
