import { ChatFolder } from '@/types';

export const saveFolders = (folders: ChatFolder[]) => {
  localStorage.setItem('folders', JSON.stringify(folders));
};
