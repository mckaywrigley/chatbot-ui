import { getClientSideUser } from '@/utils/app/auth/session';

import { User } from '@/types/auth';
import { Conversation, Message } from '@/types/chat';
import { ErrorMessage } from '@/types/error';
import { FolderInterface } from '@/types/folder';
import { OpenAIModel, OpenAIModelID } from '@/types/openai';
import { PluginKey } from '@/types/plugin';
import { Prompt } from '@/types/prompt';
import { StorageType } from '@/types/storage';
import { SystemPrompt } from '@/types/systemPrompt';

export interface HomeInitialState {
  apiKey: string;
  pluginKeys: PluginKey[];
  loading: boolean;
  lightMode: 'light' | 'dark';
  messageIsStreaming: boolean;
  modelError: ErrorMessage | null;
  models: OpenAIModel[];
  folders: FolderInterface[];
  conversations: Conversation[];
  selectedConversation: Conversation | undefined;
  currentMessage: Message | undefined;
  prompts: Prompt[];
  temperature: number;
  showChatbar: boolean;
  showPromptbar: boolean;
  currentFolder: FolderInterface | undefined;
  messageError: boolean;
  searchTerm: string;
  defaultModelId: OpenAIModelID | undefined;
  storageType: StorageType;
  serverSideApiKeyIsSet: boolean;
  serverSidePluginKeysSet: boolean;
  systemPrompts: SystemPrompt[];
  defaultSystemPromptId: string;
  user: User;
}

export const initialState: HomeInitialState = {
  apiKey: '',
  loading: false,
  pluginKeys: [],
  lightMode: 'dark',
  messageIsStreaming: false,
  modelError: null,
  models: [],
  folders: [],
  conversations: [],
  selectedConversation: undefined,
  currentMessage: undefined,
  prompts: [],
  temperature: 1,
  showPromptbar: true,
  showChatbar: true,
  currentFolder: undefined,
  messageError: false,
  searchTerm: '',
  defaultModelId: undefined,
  storageType: StorageType.LOCAL,
  serverSideApiKeyIsSet: false,
  serverSidePluginKeysSet: false,
  systemPrompts: [],
  defaultSystemPromptId: '0',
  user: await getClientSideUser(),
};
