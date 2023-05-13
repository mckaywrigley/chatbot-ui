import { FolderInterface } from '@/types/folder';
import { setData } from '../data/persist';

export const saveFolders = (folders: FolderInterface[]) => {
  setData('folders', JSON.stringify(folders));
};
