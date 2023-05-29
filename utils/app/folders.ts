import { FolderInterface } from '@/types/folder';

import remoteStorage from '@/lib/remoteStorage';

export const saveFolders = async (folders: FolderInterface[]) => {
  await remoteStorage.setItem('folders', folders);
};
