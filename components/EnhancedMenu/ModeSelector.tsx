import React, { useContext, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { PluginID } from '@/types/plugin';

import HomeContext from '@/pages/api/home/home.context';

// To switch between default / enhance mode
const ModeSelector = () => {
  const { t } = useTranslation('chat');

  const {
    state: { currentMessage, user },
    dispatch: homeDispatch,
  } = useContext(HomeContext);

  const currentSelectedPluginId = useMemo(() => {
    if (!currentMessage || currentMessage?.pluginId === null) {
      return 'default';
    } else {
      return currentMessage.pluginId;
    }
  }, [currentMessage]);

  const pluginOnChange = (pluginId: string) => {
    homeDispatch({
      field: 'currentMessage',
      value: {
        ...currentMessage,
        pluginId: pluginId === 'default' ? null : pluginId,
      },
    });
  };

  const isPaidUser = user && user?.plan === 'pro';

  return (
    <div className="flex flex-row items-center">
      <label className="text-left text-sm text-neutral-700 dark:text-neutral-400 mr-2">
        {t('Mode')}
      </label>
      <div className="rounded-lg border border-neutral-200 bg-transparent text-neutral-900 dark:border-neutral-600 dark:text-white w-fit pr-1 focus:outline-none">
        <select
          className="w-max-20 bg-transparent p-2 focus:outline-none"
          placeholder={t('Select a lang') || ''}
          value={currentSelectedPluginId}
          onChange={(e) => {
            homeDispatch({ field: 'outputLanguage', value: e.target.value });
            pluginOnChange(e.target.value);
          }}
        >
          <option
            value={'default'}
            className="dark:bg-[#343541] dark:text-white"
          >
            {t('Default mode')}
          </option>
          <option
            value={PluginID.LANGCHAIN_CHAT}
            className="dark:bg-[#343541] dark:text-white"
          >
            {t('Enhance mode')}
          </option>
          <option
            value={PluginID.GPT4}
            className="dark:bg-[#343541] dark:text-white text-yellow-600"
          >
            {t('GPT-4')}
          </option>
        </select>
      </div>
    </div>
  );
};

export default ModeSelector;
