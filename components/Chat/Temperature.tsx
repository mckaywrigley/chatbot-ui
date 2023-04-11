import { FC, useState } from 'react';
import { DEFAULT_TEMPERATURE } from '@/utils/app/const';
import { useTranslation } from 'next-i18next';

interface Props {
  label: string;
  onChangeTemperature: (temperature: number) => void;
}

export const TemperatureSlider: FC<Props> = ({
  label,
  onChangeTemperature,
}) => {
  const [temperature, setTemperature] = useState(DEFAULT_TEMPERATURE);
  const { t } = useTranslation('chat');
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(event.target.value);
    setTemperature(newValue);
    onChangeTemperature(newValue);
  };

  return (
    <div className="flex flex-col">
      <label className="mb-2 text-left text-neutral-700 dark:text-neutral-400">
        {label}
      </label>
      <span className="text-[12px] text-black/50 dark:text-white/50">
        {t(
          'Higher values like 0.8 will make the output more random, while lower values like 0.2 will make it more focused and deterministic.',
        )}
      </span>
      <span className="text-center">{temperature.toFixed(1)}</span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.1}
        value={temperature}
        onChange={handleChange}
      />
      <ul className="w mb-4 flex justify-between px-[24px]">
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