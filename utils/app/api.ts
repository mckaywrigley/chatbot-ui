import { ChatMode, ChatModeID } from '@/types/chatmode';

export const getEndpoint = (plugin: ChatMode | null) => {
  if (!plugin) {
    return 'api/chat';
  }

  if (plugin.id === ChatModeID.GOOGLE_SEARCH) {
    return 'api/google';
  }

  return 'api/chat';
};
