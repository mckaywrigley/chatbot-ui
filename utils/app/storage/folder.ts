import {FolderInterface, FolderType} from '@/types/folder';
import {StorageType} from '@/types/storage';

import {localSaveFolders} from './documentBased/local/folders';
import {
    rdbmsCreateFolder,
    rdbmsDeleteFolder,
    rdbmsUpdateFolder,
} from './rdbms/folder';

import {v4 as uuidv4} from 'uuid';

export const storageCreateFolder = (
    storageType: StorageType,
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

    if (storageType === StorageType.RDBMS) {
        rdbmsCreateFolder(newFolder);
    } else {
        localSaveFolders(updatedFolders);
    }

    return updatedFolders;
};

export const storageUpdateFolder = (
    storageType: StorageType,
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

    if (storageType === StorageType.RDBMS) {
        if (updatedFolder !== null) {
            rdbmsUpdateFolder(updatedFolder);
        }
    } else {
        localSaveFolders(updatedFolders);
    }

    return updatedFolders;
};

export const storageDeleteFolder = (
    storageType: StorageType,
    folderId: string,
    allFolders: FolderInterface[],
) => {
    const updatedFolders = allFolders.filter((f) => f.id !== folderId);
   if (storageType === StorageType.RDBMS) {
        rdbmsDeleteFolder(folderId);
    } else {
        localSaveFolders(updatedFolders);
    }

    return updatedFolders;
};
