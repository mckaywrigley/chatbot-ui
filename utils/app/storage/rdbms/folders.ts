import { FolderInterface } from '@/types/folder';

export const rdbmsGetFolders = async () => {
  const response = await fetch('api/rdbms/folders', { method: 'POST' });
  return response.json() as Promise<FolderInterface[]>;
};

export const rdbmsUpdateFolders = async (updatedFolders: FolderInterface[]) => {
  const response = await fetch('api/rdbms/folders', {
    method: 'PUT',
    body: JSON.stringify(updatedFolders),
  });
  return response.json() as Promise<FolderInterface[]>;
};
