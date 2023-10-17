import { DEFAULT_MODEL } from '@/utils/app/const';

import { Conversation, Message, Model } from '@/types/chat';
import { ErrorMessage } from '@/types/error';
import { FolderInterface } from '@/types/folder';
import { Prompt } from '@/types/prompt';

export interface HomeInitialState {
  apiKey: string;
  loading: boolean;
  lightMode: 'light' | 'dark';
  messageIsStreaming: boolean;
  modelError: ErrorMessage | null;
  folders: FolderInterface[];
  conversations: Conversation[];
  selectedConversation: Conversation | undefined;
  currentMessage: Message | undefined;
  prompts: Prompt[];
  modelId: Model;
  temperature: number;
  showChatbar: boolean;
  showPromptbar: boolean;
  currentFolder: FolderInterface | undefined;
  messageError: boolean;
}

export const initialState: HomeInitialState = {
  apiKey: '',
  loading: false,
  lightMode: 'dark',
  messageIsStreaming: false,
  modelError: null,
  folders: [],
  conversations: [],
  selectedConversation: undefined,
  currentMessage: undefined,
  prompts: [],
  modelId: DEFAULT_MODEL,
  temperature: 1,
  showPromptbar: true,
  showChatbar: true,
  currentFolder: undefined,
  messageError: false,
};
