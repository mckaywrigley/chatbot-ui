import { IconEdit } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Plugin } from '@/types/agent';

import { ChatPluginPicker } from './ChatPluginPicker';

interface ChatPluginListProps {
  selectedPlugins: Plugin[];
  onChange: (plugins: Plugin[]) => void;
}

export const ChatPluginList = ({
  selectedPlugins,
  onChange,
}: ChatPluginListProps) => {
  const { t } = useTranslation('chat');
  const [selectorIsOpen, setSelectorIsOpen] = useState(false);

  return (
    <div className="p-2">
      <div className="flex flex-row">
        <div className="flex-1 self-center">
          {selectedPlugins.length === 0 ? (
            <span className="text-gray-400">{t('Select plugins')}</span>
          ) : null}
          {selectedPlugins.map((plugin) => (
            <span
              className="bg-gray-200 dark:bg-[#343541] text-gray-800 dark:text-gray-300 border rounded-md p-1 mr-1"
              key={plugin.nameForModel}
            >
              {plugin.nameForHuman}
            </span>
          ))}
        </div>
        <button
          className="flex-none right-2 top-2 rounded-sm p-1 text-neutral-800 opacity-60 hover:bg-neutral-200 hover:text-neutral-900 dark:bg-opacity-50 dark:text-neutral-100 dark:hover:text-neutral-200"
          onClick={() => setSelectorIsOpen(true)}
        >
          <IconEdit size={20} />
        </button>
      </div>
      <ChatPluginPicker
        open={selectorIsOpen}
        onClose={(plugins) => {
          onChange(plugins);
          setSelectorIsOpen(false);
        }}
      />
    </div>
  );
};
