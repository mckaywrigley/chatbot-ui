import { createContext, Dispatch } from 'react';
import { ActionType } from '@/hooks/useCreateReducer';
import { HomeInitialState } from './home.state';
import { FolderType } from '@/types/folder';
import { SupportedExportFormats } from '@/types/export';
import { Conversation } from '@/types/chat';
import { KeyValuePair } from '@/types/data';

export interface HomeContextProps {
  state: HomeInitialState;
  dispatch: Dispatch<ActionType<HomeInitialState>>;
  handleNewConversation: () => void;
  handleLightMode: (mode: 'dark' | 'light') => void;
  handleCreateFolder: (name: string, type: FolderType) => void;
  handleDeleteFolder: (folderId: string) => void;
  handleUpdateFolder: (folderId: string, name: string) => void;
  handleSelectConversation: (conversation: Conversation) => void;
  handleDeleteConversation: (conversation: Conversation) => void;
  handleUpdateConversation: (
    conversation: Conversation,
    data: KeyValuePair,
  ) => void;
  handleApiKeyChange: (apiKey: string) => void;
  handleClearConversations: () => void;
  handleExportData: () => void;
  handleImportConversations: (data: SupportedExportFormats) => void;
}

const HomeContext = createContext<HomeContextProps>(undefined!);

export default HomeContext;
