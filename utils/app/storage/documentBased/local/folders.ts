import { User } from '@/types/auth';
import { FolderInterface } from '@/types/folder';

export const localGetFolders = (user: User) => {
  const itemName = `folders-${user.id}`;
  return JSON.parse(
    localStorage.getItem(itemName) || '[]',
  ) as FolderInterface[];
};

export const localSaveFolders = (user: User, folders: FolderInterface[]) => {
  const itemName = `folders-${user.id}`;
  localStorage.setItem(itemName, JSON.stringify(folders));
};

export const localDeleteFolders = (user: User) => {
  const itemName = `folders-${user.id}`;
  localStorage.removeItem(itemName);
};
