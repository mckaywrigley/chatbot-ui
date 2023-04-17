import { useState } from 'react';

import { useTools } from '@/hooks/useTools';

import { Tool } from '@/types/agent';

import { Dialog } from '../Dialog/Dialog';
import { Checkbox } from '../Input/Checkbox';

interface Props {
  open: boolean;
  onClose: (plugins: Tool[]) => void;
}

const PluginListItem = ({
  tool,
  checked,
  onChange,
}: {
  tool: Tool;
  checked: boolean;
  onChange: (value: boolean) => void;
}) => {
  return (
    <div className="flex">
      <div className="flex-none pr-3 self-center">
        <Checkbox
          checked={checked}
          onChange={(e) => {
            onChange(e.target.checked);
          }}
        />
      </div>
      <div className="flex-1">
        <p>{tool.nameForHuman}</p>
        <p>{tool.descriptionForHuman}</p>
      </div>
    </div>
  );
};
export const ChatPluginSelector = ({ open, onClose }: Props) => {
  const [selectedPlugins, setSelectedPlugins] = useState<Set<Tool>>(new Set());
  const { tools } = useTools();
  if (!open) {
    return null;
  }

  const handleChange = (tool: Tool, value: boolean) => {
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
      <p className="text-lg mb-4">Plugins</p>
      <div className="max-h-80 overscroll-y-auto">
        {tools &&
          tools.map((tool) => (
            <PluginListItem
              key={tool.nameForModel}
              tool={tool}
              checked={selectedPlugins.has(tool)}
              onChange={(value) => handleChange(tool, value)}
            />
          ))}
      </div>
    </Dialog>
  );
};
