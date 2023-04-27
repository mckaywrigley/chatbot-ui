import { FolderInterface } from '@/types/folder';
import { StorageType } from '@/types/storage';

import {
  couchdbGetFolders,
  couchdbSaveFolders,
} from './documentBased/couchdb/folders';
import {
  localGetFolders,
  localSaveFolders,
} from './documentBased/local/folders';
import {
  rdbmsDeleteFolders,
  rdbmsGetFolders,
  rdbmsUpdateFolders,
} from './rdbms/folders';

export const storageGetFolders = async (storageType: StorageType) => {
  if (storageType === StorageType.COUCHDB) {
    return await couchdbGetFolders();
  } else if (storageType === StorageType.RDBMS) {
    return await rdbmsGetFolders();
  } else {
    return localGetFolders();
  }
};

export const storageUpdateFolders = async (
  storageType: StorageType,
  folders: FolderInterface[],
) => {
  if (storageType === StorageType.COUCHDB) {
    await couchdbSaveFolders(folders);
  } else if (storageType === StorageType.RDBMS) {
    await rdbmsUpdateFolders(folders);
  } else {
    localSaveFolders(folders);
  }
};

export const storageDeleteFolders = async (
  storageType: StorageType,
  folderIds: string[],
  allFolders: FolderInterface[],
) => {
  const updatedFolders = allFolders.filter(
    (folder) => !folderIds.includes(folder.id),
  );

  if (storageType === StorageType.COUCHDB) {
    await couchdbSaveFolders(updatedFolders);
  } else if (storageType === StorageType.RDBMS) {
    await rdbmsDeleteFolders(folderIds);
  } else {
    localSaveFolders(updatedFolders);
  }
};
