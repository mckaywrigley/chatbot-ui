import { FolderInterface } from '@/types/folder';

export const rdbmsCreateFolder = async (newFolder: FolderInterface) => {
  await fetch('api/rdbms/folder', {
    method: 'POST',
    body: JSON.stringify(newFolder),
  });
};

export const rdbmsUpdateFolder = async (updatedFolder: FolderInterface) => {
  await fetch('api/rdbms/folder', {
    method: 'PUT',
    body: JSON.stringify(updatedFolder),
  });
};

export const rdbmsDeleteFolder = async (folderId: string) => {
  await fetch('api/rdbms/folder', {
    method: 'DELETE',
    body: JSON.stringify({ folder_id: folderId }),
  });
};
