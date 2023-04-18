import { Dispatch, createContext } from 'react';

import { ActionType } from '@/hooks/useCreateReducer';

import { Conversation } from '@/types/chat';
import { ChatModeKey } from '@/types/chatmode';
import { SupportedExportFormats } from '@/types/export';

import { ChatbarInitialState } from './Chatbar.state';

export interface ChatbarContextProps {
  state: ChatbarInitialState;
  dispatch: Dispatch<ActionType<ChatbarInitialState>>;
  handleDeleteConversation: (conversation: Conversation) => void;
  handleClearConversations: () => void;
  handleExportData: () => Promise<void>;
  handleImportConversations: (data: SupportedExportFormats) => Promise<void>;
  handlePluginKeyChange: (pluginKey: ChatModeKey) => void;
  handleClearPluginKey: (pluginKey: ChatModeKey) => void;
  handleApiKeyChange: (apiKey: string) => void;
}

const ChatbarContext = createContext<ChatbarContextProps>(undefined!);

export default ChatbarContext;
