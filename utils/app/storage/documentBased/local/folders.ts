import {FolderInterface} from '@/types/folder';

export const localGetFolders = () => {
    return JSON.parse(
        localStorage.getItem('folders') || '[]',
    ) as FolderInterface[];
};

export const localSaveFolders = (folders: FolderInterface[]) => {
    localStorage.setItem('folders', JSON.stringify(folders));
};
