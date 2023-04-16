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
  GOOGLE_SEARCH = 'google-search',
  AGENT = 'agent',
}

export enum ChatModeName {
  GOOGLE_SEARCH = 'Google Search',
  AGENT = 'Agent',
}

export const ChatModes: Record<ChatModeID, ChatMode> = {
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
  [ChatModeID.AGENT]: {
    id: ChatModeID.AGENT,
    name: ChatModeName.AGENT,
    requiredKeys: [],
  },
};

export const ChatModeList = Object.values(ChatModes);
