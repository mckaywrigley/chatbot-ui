export interface Folder {
  id: string;
  name: string;
  type: FolderType;
}

export type FolderType = 'chat' | 'prompt';
