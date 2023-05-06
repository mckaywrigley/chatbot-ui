import { User } from '@/types/auth';
import { FolderInterface, FolderType } from '@/types/folder';
import { StorageType } from '@/types/storage';

import { couchdbSaveFolders } from './documentBased/couchdb/folders';
import { localSaveFolders } from './documentBased/local/folders';
import {
  rdbmsCreateFolder,
  rdbmsDeleteFolder,
  rdbmsUpdateFolder,
} from './rdbms/folder';

import { v4 as uuidv4 } from 'uuid';

export const storageCreateFolder = (
  storageType: StorageType,
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

  if (storageType === StorageType.COUCHDB) {
    couchdbSaveFolders(updatedFolders);
  } else if (storageType === StorageType.RDBMS) {
    rdbmsCreateFolder(newFolder);
  } else {
    localSaveFolders(user, updatedFolders);
  }

  return updatedFolders;
};

export const storageUpdateFolder = (
  storageType: StorageType,
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

  if (storageType === StorageType.COUCHDB) {
    couchdbSaveFolders(updatedFolders);
  } else if (storageType === StorageType.RDBMS) {
    if (updatedFolder !== null) {
      rdbmsUpdateFolder(updatedFolder);
    }
  } else {
    localSaveFolders(user, updatedFolders);
  }

  return updatedFolders;
};

export const storageDeleteFolder = (
  storageType: StorageType,
  user: User,
  folderId: string,
  allFolders: FolderInterface[],
) => {
  const updatedFolders = allFolders.filter((f) => f.id !== folderId);
  if (storageType === StorageType.COUCHDB) {
    couchdbSaveFolders(updatedFolders);
  } else if (storageType === StorageType.RDBMS) {
    rdbmsDeleteFolder(folderId);
  } else {
    localSaveFolders(user, updatedFolders);
  }

  return updatedFolders;
};
