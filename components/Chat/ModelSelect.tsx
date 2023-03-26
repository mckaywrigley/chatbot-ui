import { OpenAIModel } from '@/types';
import { FC } from 'react';
import { useTranslation } from 'next-i18next';

interface Props {
  model: OpenAIModel;
  models: OpenAIModel[];
  onModelChange: (model: OpenAIModel) => void;
}

export const ModelSelect: FC<Props> = ({ model, models, onModelChange }) => {
  const { t } = useTranslation('chat');
  return (
    <div className="flex flex-col">
      <label className="mb-2 text-left text-neutral-700 dark:text-neutral-400">
        {t('Model')}
      </label>
      <div className="w-full rounded-lg border border-neutral-200 bg-transparent pr-2 text-neutral-900 dark:border-neutral-600 dark:text-white">
        <select
          className="focus:shadow-outline w-full cursor-pointer appearance-none rounded-lg border border-neutral-500 p-3 text-neutral-900 dark:border-neutral-400 dark:bg-[#343541] dark:text-white"
          placeholder={t('Select a model') || ''}
          value={model.id}
          onChange={(e) => {
            onModelChange(
              models.find(
                (model) => model.id === e.target.value,
              ) as OpenAIModel,
            );
          }}
        >
          {models.map((model) => (
            <option
              key={model.id}
              value={model.id}
              className="dark:bg-[#343541] dark:text-white"
            >
              {model.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
