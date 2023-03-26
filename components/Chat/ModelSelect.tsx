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
      <div className="w-full rounded-lg border border-neutral-200 pr-2 bg-transparent text-neutral-900 dark:border-neutral-600 dark:text-white">
        <select
          className="bg-transparent w-full outline-0 p-2"
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
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
