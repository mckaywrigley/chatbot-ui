import {
  IconBolt,
  IconBrandGoogle,
  IconEdit,
  IconRobot,
} from '@tabler/icons-react';
import { useState } from 'react';

import { ChatPluginSelector } from './ChatPluginSelector';

export const ChatPluginList = () => {
  const [selectorIsOpen, setSelectorIsOpen] = useState(false);
  const [selectedPlugins, setSelectedPlugins] = useState<string[]>([]);

  const handlePluginClick = (pluginName: string) => {
    if (selectedPlugins.includes(pluginName)) {
      setSelectedPlugins(selectedPlugins.filter((name) => name !== pluginName));
    } else {
      setSelectedPlugins([...selectedPlugins, pluginName]);
    }
  };

  return (
    <div className="p-2">
      <div className="flex flex-row">
        <div className="flex-1">
          <div className="flex-1 items-center space-x-2 cursor-pointer">
            <span>Plugin 1</span>
          </div>
        </div>
        <div className="flex-none" onClick={() => setSelectorIsOpen(true)}>
          <IconEdit size={20} />
        </div>
      </div>
      <ChatPluginSelector open={selectorIsOpen} />
    </div>
  );
};
