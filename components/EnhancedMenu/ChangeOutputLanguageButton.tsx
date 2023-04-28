import React, { useContext, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { getAvailableLocales } from '@/utils/app/i18n';
import { saveOutputLanguage } from '@/utils/app/outputLanguage';

import HomeContext from '@/pages/api/home/home.context';
import { PluginID } from '@/types/plugin';

function ChangeOutputLanguageButton() {
  const { t } = useTranslation('model');
  const [disableSelection, setDisableSelection] = useState(false);

  const {
    state: { outputLanguage, currentMessage },
    dispatch: homeDispatch,
  } = useContext(HomeContext);

  const availableLocales = getAvailableLocales();

  const locales = [
    {
      name: t('Auto'),
      value: '',
    },
    ...availableLocales,
  ];

  // Disable language selection if plugin is selected to be LangChain
  useEffect(() => {
    if(currentMessage?.pluginId === PluginID.LANGCHAIN_CHAT){
      setDisableSelection(true);
    }else{
      setDisableSelection(false);
    }
  }, [currentMessage])

  return (
    <div className="flex flex-row items-center justify-between mt-2 md:justify-start md:mt-0">
      <label className="text-left text-sm text-neutral-700 dark:text-neutral-400 mr-2">
        {t('Language')}
      </label>
      <div className="rounded-lg border border-neutral-200 bg-transparent text-neutral-900 dark:border-neutral-600 dark:text-white w-fit pr-1 focus:outline-none">
        <select
          className="w-max-20 bg-transparent p-2 focus:outline-none"
          placeholder={t('Select a lang') || ''}
          value={outputLanguage}
          disabled={disableSelection}
          onChange={(e) => {
            homeDispatch({ field: 'outputLanguage', value: e.target.value });
            saveOutputLanguage(e.target.value);
          }}
        >
          {locales.map((locale) => (
            <option
              key={locale.value}
              value={locale.value}
              className="dark:bg-[#343541] dark:text-white"
            >
              {locale.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

ChangeOutputLanguageButton.propTypes = {};
export default ChangeOutputLanguageButton;
