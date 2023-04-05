import { OpenAIModel, OpenAIModelID } from '@/types/openai';
import { ErrorMessage } from '@/types/error';
import { Folder } from '@/types/folder';
import { Message, Conversation } from '@/types/chat';
import { Prompt } from '@/types/prompt';

export interface HomeInitialState {
  currentFolder: Folder | undefined;
  folders: Folder[];
  prompts: Prompt[];
  conversations: Conversation[];
  selectedConversation: Conversation | undefined;
  loading: boolean;
  models: OpenAIModel[];
  lightMode: 'light' | 'dark';
  messageIsStreaming: boolean;
  showPromptbar: boolean;
  showSidebar: boolean;
  apiKey: string;
  messageError: boolean;
  modelError: ErrorMessage | null;
  currentMessage: Message | undefined;
  searchTerm: string;
  defaultModelId: OpenAIModelID | undefined;
  serverSideApiKeyIsSet: boolean;
}

export const initialState: HomeInitialState = {
  currentFolder: undefined,
  folders: [],
  prompts: [],
  conversations: [],
  selectedConversation: undefined,
  loading: false,
  models: [],
  lightMode: 'light',
  messageIsStreaming: false,
  showPromptbar: true,
  showSidebar: true,
  apiKey: '',
  messageError: false,
  modelError: null,
  currentMessage: undefined,
  searchTerm: '',
  defaultModelId: undefined,
  serverSideApiKeyIsSet: false,
};
