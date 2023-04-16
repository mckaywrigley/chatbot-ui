export interface FolderInterface {
  id: string;
  name: string;
  type: FolderType;
}

export type FolderType = 'chat' | 'prompt';
