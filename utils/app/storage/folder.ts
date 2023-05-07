import { User } from 'chatbot-ui-core/types/auth';
import { FolderInterface, FolderType } from 'chatbot-ui-core/types/folder';

import { Database } from 'chatbot-ui-core';
import { v4 as uuidv4 } from 'uuid';

export const storageCreateFolder = (
  database: Database,
  user: User,
  name: string,
  folderType: FolderType,
  allFolders: FolderInterface[],
) => {
  const newFolder: FolderInterface = {
    id: uuidv4(),
    name,
    type: folderType,
  };

  const updatedFolders = [...allFolders, newFolder];

  database.createFolder(user, newFolder);

  return updatedFolders;
};

export const storageUpdateFolder = (
  database: Database,
  user: User,
  folderId: string,
  name: string,
  allFolders: FolderInterface[],
) => {
  let updatedFolder: FolderInterface | null = null;
  const updatedFolders = allFolders.map((f) => {
    if (f.id === folderId) {
      updatedFolder = {
        ...f,
        name,
      };

      return updatedFolder;
    }

    return f;
  });

  database.updateFolder(user, updatedFolder!);

  return updatedFolders;
};

export const storageDeleteFolder = (
  database: Database,
  user: User,
  folderId: string,
  allFolders: FolderInterface[],
) => {
  const updatedFolders = allFolders.filter((f) => f.id !== folderId);

  database.deleteFolder(user, folderId);

  return updatedFolders;
};
