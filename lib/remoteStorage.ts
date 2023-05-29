import { Conversation } from '@/types/chat';
import { Prompt } from '@/types/prompt';

import { historyDELETE, historyGET, historyPOST } from './storages/history';
import { promptsDELETE, promptsGET, promptsPOST } from './storages/prompts';

class RemoteStorage {
  async getItem(key: string) {
    if (key === 'conversationHistory') {
      return await historyGET();
    }

    if (key === 'prompts') {
      return await promptsGET();
    }
  }

  async setItem(key: string, value: Conversation[] | Prompt[]) {
    if (key === 'conversationHistory') {
      await historyPOST(value as Conversation[]);
    }

    if (key === 'prompts') {
      await promptsPOST(value as Prompt[]);
    }
  }

  async removeItem(key: string) {
    if (key === 'conversationHistory') {
      await historyDELETE();
    }

    if (key === 'prompts') {
      await promptsDELETE();
    }
  }
}

const remoteStorage = new RemoteStorage();

export default remoteStorage;
