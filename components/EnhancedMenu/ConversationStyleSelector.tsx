import React, { useContext, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import HomeContext from '@/pages/api/home/home.context';

const ConversationStyleSelector = () => {
  const { t } = useTranslation('model');

  const {
    state: { selectedConversation },
    dispatch: homeDispatch,
  } = useContext(HomeContext);

  const currentTemperature = useMemo(() => {
    if (!selectedConversation) return 0.5;
    return selectedConversation.temperature;
  }, [selectedConversation]);

  const temperatureOnChange = (temperature: string) => {
    homeDispatch({
      field: 'selectedConversation',
      value: {
        ...selectedConversation,
        temperature: +temperature,
      },
    });
  };

  return (
    <div className="flex flex-row items-center justify-between mt-2 md:justify-start md:mt-0">
      <label className="text-left text-sm text-neutral-700 dark:text-neutral-400 mr-2">
        {t('Style')}
      </label>
      <div className="rounded-lg border border-neutral-200 bg-transparent text-neutral-900 dark:border-neutral-600 dark:text-white w-fit pr-1 focus:outline-none">
        <select
          className="w-max-20 bg-transparent p-2 focus:outline-none"
          value={currentTemperature}
          onChange={(e) => {
            temperatureOnChange(e.target.value);
          }}
        >
          <option value={1} className="dark:bg-[#343541] dark:text-white">
            {t('Creative')}
          </option>
          <option value={0.5} className="dark:bg-[#343541] dark:text-white">
            {t('Balanced')}
          </option>
          <option value={0.2} className="dark:bg-[#343541] dark:text-white">
            {t('Precise')}
          </option>
        </select>
      </div>
    </div>
  );
};

export default ConversationStyleSelector;
