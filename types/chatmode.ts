import { KeyValuePair } from './data';

export interface ChatMode {
  id: ChatModeID;
  name: ChatModeName;
  requiredKeys: KeyValuePair[];
}

export interface ChatModeKey {
  chatModeId: ChatModeID;
  requiredKeys: KeyValuePair[];
}

export enum ChatModeID {
  DIRECT = 'direct',
  AGENT = 'agent',
  GOOGLE_SEARCH = 'google-search',
}

export enum ChatModeName {
  DIRECT = 'Chat',
  AGENT = 'Agent',
  GOOGLE_SEARCH = 'Google Search',
}

export const ChatModes: Record<ChatModeID, ChatMode> = {
  [ChatModeID.DIRECT]: {
    id: ChatModeID.DIRECT,
    name: ChatModeName.DIRECT,
    requiredKeys: [],
  },
  [ChatModeID.AGENT]: {
    id: ChatModeID.AGENT,
    name: ChatModeName.AGENT,
    requiredKeys: [],
  },
  [ChatModeID.GOOGLE_SEARCH]: {
    id: ChatModeID.GOOGLE_SEARCH,
    name: ChatModeName.GOOGLE_SEARCH,
    requiredKeys: [
      {
        key: 'GOOGLE_API_KEY',
        value: '',
      },
      {
        key: 'GOOGLE_CSE_ID',
        value: '',
      },
    ],
  },
};

export const ChatModeList = Object.values(ChatModes);
