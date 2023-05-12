import { User } from 'chatbot-ui-core/types/auth';
import { FolderInterface } from 'chatbot-ui-core/types/folder';

import { Database } from 'chatbot-ui-core';

export const storageGetFolders = async (database: Database, user: User) => {
  return await database.getFolders(user);
};

export const storageUpdateFolders = async (
  database: Database,
  user: User,
  folders: FolderInterface[],
) => {
  await database.updateFolders(user, folders).then((success) => {
    if (!success) {
      console.log('Failed to update folders');
    }
  });
};

export const storageDeleteFolders = async (
  database: Database,
  user: User,
  folderIds: string[],
) => {
  await database.deleteFolders(user, folderIds).then((success) => {
    if (!success) {
      console.log('Failed to delete folders');
    }
  });
};
