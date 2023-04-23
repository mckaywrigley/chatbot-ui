import { FolderInterface } from '@/types/folder';

export const couchdbGetFolders = async () => {
  const response = await fetch('api/folders');
  return response.json() as Promise<FolderInterface[]>;
};

export const couchdbSaveFolders = async (folders: FolderInterface[]) => {
  const response = await fetch('api/folders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(folders),
  });
  return response.json();
};
