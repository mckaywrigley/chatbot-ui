import { FolderInterface } from '@/types/folder';

export const foldersGET = async () => {
  const response = await fetch('/api/folders');
  const folders = await response.json();
  return folders;
};

export const foldersPOST = async (folders: FolderInterface[]) => {
  const body = folders.map((folder) => ({
    id: folder.id,
    name: folder.name,
    type: folder.type,
  }));

  await fetch('/api/folders', {
    method: 'POST',
    body: JSON.stringify({ folders: body }),
  });
};

export const foldersDELETE = async () => {
  await fetch('/api/folders', {
    method: 'DELETE',
  });
};
