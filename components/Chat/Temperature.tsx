import { FC, useContext, useState } from 'react';

import { useTranslation } from 'next-i18next';

import { getSettings } from '@/utils/app/settings';

import HomeContext from '@/pages/api/home/home.context';

interface Props {
  onChangeTemperature: (temperature: number) => void;
}

export const TemperatureSlider: FC<Props> = ({ onChangeTemperature }) => {
  const {
    state: { conversations },
  } = useContext(HomeContext);
  const settings = getSettings();
  const [temperature, setTemperature] = useState(settings.defaultTemperature);
  const { t } = useTranslation('chat');
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(event.target.value);
    setTemperature(newValue);
    onChangeTemperature(newValue);
  };

  return (
    <div className="flex flex-col">
      <span className="text-[12px] text-black/50 dark:text-white/50 text-sm">
        {t(
          'Higher values like 0.8 will make the output more random, while lower values like 0.2 will make it more focused and deterministic.',
        )}
      </span>
      <span className="mt-2 mb-1 text-center text-neutral-900 dark:text-neutral-100">
        {temperature.toFixed(1)}
      </span>
      <input
        className="cursor-pointer"
        type="range"
        min={0}
        max={1}
        step={0.1}
        value={temperature}
        onChange={handleChange}
      />
      <ul className="w mt-2 pb-8 flex justify-between px-[24px] text-neutral-900 dark:text-neutral-100">
        <li className="relative flex justify-center">
          <span className="absolute">{t('Precise')}</span>
        </li>
        <li className="relative flex justify-center">
          <span className="absolute">{t('Neutral')}</span>
        </li>
        <li className="relative flex justify-center">
          <span className="absolute">{t('Creative')}</span>
        </li>
      </ul>
    </div>
  );
};
