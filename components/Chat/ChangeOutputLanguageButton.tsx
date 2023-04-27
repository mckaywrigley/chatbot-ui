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

  const availableLocales = getAvailableLocales().map((locale) => ({
    name: locale,
    value: locale,
  }));

  const locales = [
    {
      name: 'Auto',
      value: '',
    },
    ...availableLocales,
  ];

  return (
    <div className="p-4 flex flex-col w-max">
      <label className="mb-2 text-left text-neutral-700 dark:text-neutral-400">
        {t('Output Language')}
      </label>
      <div className="rounded-lg border border-neutral-200 bg-transparent pr-2 text-neutral-900 dark:border-neutral-600 dark:text-white">
        <select
          className="w-max bg-transparent p-2"
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
