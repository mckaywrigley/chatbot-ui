import { FolderInterface } from '@/types/folder';

export const getFolders = async (databaseType: string) => {
  if (databaseType === 'couchdb'){
    const response = await fetch('api/folders');
    return response.json() as Promise<FolderInterface[]>;
  }
  return JSON.parse(localStorage.getItem('folders') || '[]') as FolderInterface[];
};

export const saveFolders = async (databaseType: string, folders: FolderInterface[]) => {
  if (databaseType === 'couchdb'){
    const response = await fetch('api/folders',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(folders),
      }
    );
    return response.json();
  }
  localStorage.setItem('folders', JSON.stringify(folders));
};
