import { useState } from 'react';

import { usePlugins } from '@/hooks/usePlugins';

import { Plugin } from '@/types/agent';

import { Dialog } from '../Dialog/Dialog';
import { Checkbox } from '../Input/Checkbox';

interface Props {
  open: boolean;
  onClose: (plugins: Plugin[]) => void;
}

const PluginListItem = ({
  tool,
  checked,
  onChange,
}: {
  tool: Plugin;
  checked: boolean;
  onChange: (value: boolean) => void;
}) => {
  return (
    <div className="flex cursor-pointer p-1" onClick={() => onChange(!checked)}>
      <div className="flex-none pr-3 self-center">
        <Checkbox
          checked={checked}
          onChange={(e) => {
            onChange(!checked);
          }}
        />
      </div>
      <div className="flex-1 text-gray-500 dark:text-gray-400">
        <p className="text-lg">{tool.nameForHuman}</p>
        <p>{tool.descriptionForHuman}</p>
      </div>
    </div>
  );
};
export const ChatPluginPicker = ({ open, onClose }: Props) => {
  const [selectedPlugins, setSelectedPlugins] = useState<Set<Plugin>>(
    new Set(),
  );
  const { plugins } = usePlugins();
  if (!open) {
    return null;
  }

  const handleChange = (tool: Plugin, value: boolean) => {
    if (value) {
      setSelectedPlugins(new Set(selectedPlugins).add(tool));
    } else {
      const newValue = new Set(selectedPlugins);
      newValue.delete(tool);
      setSelectedPlugins(newValue);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => onClose(Array.from(selectedPlugins.values()))}
    >
      <p className="text-lg mb-4 text-gray-500 dark:text-gray-400">Plugins</p>
      <div className="max-h-80 overscroll-y-auto divide-y-2">
        {plugins &&
          plugins.map((plugin) => (
            <PluginListItem
              key={plugin.nameForModel}
              tool={plugin}
              checked={selectedPlugins.has(plugin)}
              onChange={(value) => handleChange(plugin, value)}
            />
          ))}
      </div>
    </Dialog>
  );
};
