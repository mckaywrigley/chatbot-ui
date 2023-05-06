import {FolderInterface} from '@/types/folder';
import {StorageType} from '@/types/storage';

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
    if (storageType === StorageType.RDBMS) {
        return await rdbmsGetFolders();
    } else {
        return localGetFolders();
    }
};

export const storageUpdateFolders = async (
    storageType: StorageType,
    folders: FolderInterface[],
) => {
   if (storageType === StorageType.RDBMS) {
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

   if (storageType === StorageType.RDBMS) {
        await rdbmsDeleteFolders(folderIds);
    } else {
        localSaveFolders(updatedFolders);
    }
};
