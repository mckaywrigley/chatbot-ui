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
import { rdbmsGetFolders, rdbmsUpdateFolders } from './rdbms/folders';

export const storageGetFolders = async (storageType: StorageType) => {
  if (storageType === StorageType.COUCHDB) {
    return await couchdbGetFolders();
  } else if (storageType === StorageType.RDBMS) {
    return await rdbmsGetFolders();
  } else {
    return localGetFolders();
  }
};

export const storageUpdateFolders = (
  storageType: StorageType,
  folders: FolderInterface[],
) => {
  if (storageType === StorageType.COUCHDB) {
    couchdbSaveFolders(folders);
  } else if (storageType === StorageType.RDBMS) {
    rdbmsUpdateFolders(folders);
  } else {
    localSaveFolders(folders);
  }
};
