import { Conversation } from '@/types/chat';
import { FolderInterface } from '@/types/folder';
import { Prompt } from '@/types/prompt';

import { foldersDELETE, foldersGET, foldersPOST } from './storages/folders';
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

    if (key === 'folders') {
      return await foldersGET();
    }
  }

  async setItem(
    key: string,
    value: Conversation[] | Prompt[] | FolderInterface[],
  ) {
    if (key === 'conversationHistory') {
      await historyPOST(value as Conversation[]);
    }

    if (key === 'prompts') {
      await promptsPOST(value as Prompt[]);
    }

    if (key === 'folders') {
      await foldersPOST(value as FolderInterface[]);
    }
  }

  async removeItem(key: string) {
    if (key === 'conversationHistory') {
      await historyDELETE();
    }

    if (key === 'prompts') {
      await promptsDELETE();
    }

    if (key === 'folders') {
      await foldersDELETE();
    }
  }
}

const remoteStorage = new RemoteStorage();

export default remoteStorage;
