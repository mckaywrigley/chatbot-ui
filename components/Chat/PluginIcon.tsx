import { IconBolt, IconBrandGoogle, IconRobot } from '@tabler/icons-react';

import { Plugin, PluginID } from '@/types/plugin';

export const PluginIcon = ({ plugin }: { plugin: Plugin | null }) => {
  if (!plugin) {
    return <IconBolt size={20} />;
  }
  switch (plugin.id) {
    case PluginID.AGENT:
      return <IconRobot size={20} />;
    case PluginID.GOOGLE_SEARCH:
      return <IconBrandGoogle size={20} />;
  }
};
