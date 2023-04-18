import { MutableRefObject } from 'react';

import { useAgentMode } from '@/hooks/chatmode/useAgentMode';
import { useDirectMode } from '@/hooks/chatmode/useDirectMode';
import { useGoogleMode } from '@/hooks/chatmode/useGoogleMode';

import { ChatModeRunner, Conversation } from '@/types/chat';
import { ChatMode, ChatModeID } from '@/types/chatmode';

export const useChatModeRunner = (
  conversations: Conversation[],
  stopConversationRef: MutableRefObject<boolean>,
) => {
  const directMode = useDirectMode(conversations, stopConversationRef);
  const googleMode = useGoogleMode(conversations);
  const agentMode = useAgentMode(conversations, stopConversationRef);
  return (plugin: ChatMode | null): ChatModeRunner => {
    if (!plugin) {
      return directMode;
    }
    switch (plugin.id) {
      case ChatModeID.GOOGLE_SEARCH:
        return googleMode;
      case ChatModeID.AGENT:
        return agentMode;
      default:
        return directMode;
    }
  };
};
