import React, { useContext, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getAvailableLocales } from '@/utils/app/i18n';
import { saveOutputLanguage } from '@/utils/app/outputLanguage';

import HomeContext from '@/pages/api/home/home.context';

function ChangeOutputLanguageButton() {
  const { t } = useTranslation('chat');

  const {
    state: { outputLanguage },
    dispatch: homeDispatch,
  } = useContext(HomeContext);

  const availableLocales = getAvailableLocales();

  const locales = [
    {
      name: 'Auto',
      value: '',
    },
    ...availableLocales,
  ];

  return (
    <div className="flex flex-row items-center">
      <label className="text-left text-sm text-neutral-700 dark:text-neutral-400 mr-2">
        {t('Language')}
      </label>
      <div className="rounded-lg border border-neutral-200 bg-transparent text-neutral-900 dark:border-neutral-600 dark:text-white w-fit pr-1 focus:outline-none">
        <select
          className="w-max-20 bg-transparent p-2 focus:outline-none"
          placeholder={t('Select a lang') || ''}
          value={outputLanguage}
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
