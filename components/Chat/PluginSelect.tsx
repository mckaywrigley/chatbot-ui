import { FC, useEffect, useRef } from 'react';

import { useTranslation } from 'next-i18next';

import { Plugin, PluginList } from '@/types/plugin';

interface Props {
  plugin: Plugin | null;
  onPluginChange: (plugin: Plugin) => void;
}

export const PluginSelect: FC<Props> = ({ plugin, onPluginChange }) => {
  const { t } = useTranslation('chat');

  const selectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (selectRef.current) {
      selectRef.current.focus();
    }
  }, []);

  return (
    <div className="flex flex-col">
      <div className="w-full rounded-lg border border-neutral-200 bg-transparent pr-2 text-neutral-900 dark:border-neutral-600 dark:text-white">
        <select
          ref={selectRef}
          className="w-full cursor-pointer bg-transparent p-2"
          placeholder={t('Select a plugin') || ''}
          value={plugin?.id || ''}
          onChange={(e) => {
            onPluginChange(
              PluginList.find(
                (plugin) => plugin.id === e.target.value,
              ) as Plugin,
            );
          }}
        >
          <option
            key="none"
            value=""
            className="dark:bg-[#343541] dark:text-white"
          >
            Select Plugin
          </option>

          {PluginList.map((plugin) => (
            <option
              key={plugin.id}
              value={plugin.id}
              className="dark:bg-[#343541] dark:text-white"
            >
              {plugin.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
