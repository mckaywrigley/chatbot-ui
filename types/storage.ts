import { Conversation } from 'chatbot-ui-core/types/chat';
import { FolderInterface } from 'chatbot-ui-core/types/folder';
import { Prompt } from 'chatbot-ui-core/types/prompt';

import { PluginKey } from './plugin';

// keep track of local storage schema
export interface LocalStorage {
  apiKey: string;
  conversationHistory: Conversation[];
  selectedConversation: Conversation;
  theme: 'light' | 'dark';
  // added folders (3/23/23)
  folders: FolderInterface[];
  // added prompts (3/26/23)
  prompts: Prompt[];
  // added showChatbar and showPromptbar (3/26/23)
  showChatbar: boolean;
  showPromptbar: boolean;
  // added plugin keys (4/3/23)
  pluginKeys: PluginKey[];
}
