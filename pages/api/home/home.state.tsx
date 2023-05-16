import { getUser } from '@/utils/app/auth/helpers';
import { getDatabase } from '@/utils/app/extensions/database';

import { ErrorMessage } from '@/types/error';
import { OpenAIModel, OpenAIModelID } from '@/types/openai';
import { PluginKey } from '@/types/plugin';
import { User } from '@chatbot-ui/core/types/auth';
import { Conversation, Message } from '@chatbot-ui/core/types/chat';
import { FolderInterface } from '@chatbot-ui/core/types/folder';
import { Prompt } from '@chatbot-ui/core/types/prompt';
import { SystemPrompt } from '@chatbot-ui/core/types/system-prompt';

import { Database } from '@chatbot-ui/core';

export interface HomeInitialState {
  apiKey: string;
  database: Database;
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
  systemPrompts: SystemPrompt[];
  defaultSystemPromptId: string;
  user: User;
}

export const initialState: HomeInitialState = {
  apiKey: '',
  database: await getDatabase(),
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
  serverSideApiKeyIsSet: false,
  serverSidePluginKeysSet: false,
  systemPrompts: [],
  defaultSystemPromptId: '0',
  user: await getUser(),
};
