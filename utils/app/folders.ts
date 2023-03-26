import { Folder } from '@/types/folder';

export const saveFolders = (folders: Folder[]) => {
  localStorage.setItem('folders', JSON.stringify(folders));
};
