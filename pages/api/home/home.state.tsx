import { Conversation, Message } from '@/types/chat';
import { ErrorMessage } from '@/types/error';
import { FolderInterface } from '@/types/folder';
import { OpenAIModel, OpenAIModelID } from '@/types/openai';
import { PluginKey } from '@/types/plugin';
import { Prompt } from '@/types/prompt';
import { CreditUsage, User } from '@/types/user';

import { SupabaseClient } from '@supabase/supabase-js';

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
  serverSideApiKeyIsSet: boolean;
  serverSidePluginKeysSet: boolean;
  outputLanguage: string;

  // Supabase / Cloud Sync
  supabaseClient: SupabaseClient | null;
  conversationLastSyncAt: number | null;
  conversationLastUpdatedAt: number | null;
  forceSyncConversation: boolean;
  replaceRemoteData: boolean;
  syncingConversation: boolean;
  syncSuccess: boolean | null; // null = not yet synced

  // User Auth
  showLoginSignUpModel: boolean;
  showProfileModel: boolean;
  showUsageModel: boolean;
  showSurveyModel: boolean;
  user: User | null;
  isPaidUser: boolean;
  isSurveyFilled: boolean;

  // Plugins Utils
  creditUsage: CreditUsage | null;

  // Text to Speech
  currentSpeechId: null | string;
  speechToken: null | string;
  speechRegion: null | string;
  isPlaying: boolean;
  isLoading: boolean;
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
  showPromptbar: false,
  showChatbar: true,
  currentFolder: undefined,
  messageError: false,
  searchTerm: '',
  defaultModelId: undefined,
  serverSideApiKeyIsSet: false,
  serverSidePluginKeysSet: false,
  outputLanguage: '',

  // Supabase / Cloud Sync
  supabaseClient: null,
  conversationLastSyncAt: null,
  conversationLastUpdatedAt: null,
  forceSyncConversation: true, // Sync on first load
  replaceRemoteData: false,
  syncingConversation: false,
  syncSuccess: null,

  // User Auth
  showLoginSignUpModel: false,
  showProfileModel: false,
  showUsageModel: false,
  showSurveyModel: false,
  user: null,
  isPaidUser: false,
  isSurveyFilled: false,

  // Plugins Utils
  creditUsage: null,

  // Text to Speech
  currentSpeechId: null,
  speechToken: null,
  speechRegion: null,
  isPlaying: false,
  isLoading: false,
};
