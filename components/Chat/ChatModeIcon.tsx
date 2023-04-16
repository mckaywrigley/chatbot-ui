import { IconBolt, IconBrandGoogle, IconRobot } from '@tabler/icons-react';

import { ChatMode, ChatModeID } from '@/types/chatmode';

export const ChatModeIcon = ({ chatMode }: { chatMode: ChatMode | null }) => {
  if (!chatMode) {
    return <IconBolt size={20} />;
  }
  switch (chatMode.id) {
    case ChatModeID.AGENT:
      return <IconRobot size={20} />;
    case ChatModeID.GOOGLE_SEARCH:
      return <IconBrandGoogle size={20} />;
  }
};
