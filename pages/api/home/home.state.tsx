import { OpenAIModel, OpenAIModelID } from '@/types/openai';
import { ErrorMessage } from '@/types/error';
import { Folder } from '@/types/folder';
import { Message, Conversation } from '@/types/chat';
import { Prompt } from '@/types/prompt';
import { PluginKey } from '@/types/plugin';

export interface HomeInitialState {
  apiKey: string;
  pluginKeys: PluginKey[];
  loading: boolean;
  lightMode: 'light' | 'dark';
  messageIsStreaming: boolean;
  modelError: ErrorMessage | null;
  models: OpenAIModel[];
  folders: Folder[];
  conversations: Conversation[];
  selectedConversation: Conversation | undefined;
  currentMessage: Message | undefined;
  prompts: Prompt[];
  showSidebar: boolean;
  showPromptbar: boolean;

  currentFolder: Folder | undefined;
  messageError: boolean;
  searchTerm: string;
  defaultModelId: OpenAIModelID | undefined;
  serverSideApiKeyIsSet: boolean;
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
  showPromptbar: true,
  showSidebar: true,

  currentFolder: undefined,
  messageError: false,
  searchTerm: '',
  defaultModelId: undefined,
  serverSideApiKeyIsSet: false,
};
