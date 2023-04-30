import {
  IconBolt,
  IconBrain,
  IconNumber4
} from '@tabler/icons-react';
import { PluginID } from '@/types/plugin';

export const getPluginIcon = (pluginId: string | undefined | null) => {
  if (!pluginId) {
    return <IconBolt size={20} />;
  }

  switch (pluginId) {
    case PluginID.LANGCHAIN_CHAT:
      return <IconBrain size={20} />;
    case PluginID.GPT4:
      return <IconNumber4 size={20} />;
    default:
      return <IconBolt size={20} />;
  }
};