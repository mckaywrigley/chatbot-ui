import { Conversation } from './chat';
import { Folder } from './folder';
import { Prompt } from './prompt';

// keep track of local storage schema
export interface LocalStorage {
  apiKey: string;
  conversationHistory: Conversation[];
  selectedConversation: Conversation;
  theme: 'light' | 'dark';
  // added folders (3/23/23)
  folders: Folder[];
  // added prompts (3/26/23)
  prompts: Prompt[];
}
