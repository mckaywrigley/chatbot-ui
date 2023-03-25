import { OpenAIModel } from "@/types";
import { FC } from "react";
import { useTranslation } from "next-i18next";

interface Props {
  model: OpenAIModel;
  models: OpenAIModel[];
  onModelChange: (model: OpenAIModel) => void;
}

export const ModelSelect: FC<Props> = ({ model, models, onModelChange }) => {
  const {t} = useTranslation('chat')
  return (
    <div className="flex flex-col">
      <label className="text-left mb-2 dark:text-neutral-400 text-neutral-700">{t('Model')}</label>
      <select
        className="w-full p-3 dark:text-white dark:bg-[#343541] border border-neutral-500 rounded-lg appearance-none focus:shadow-outline text-neutral-900 cursor-pointer"
        placeholder={t("Select a model") || ''}
        value={model.id}
        onChange={(e) => {
          onModelChange(models.find((model) => model.id === e.target.value) as OpenAIModel);
        }}
      >
        {models.map((model) => (
          <option
            key={model.id}
            value={model.id}
          >
            {model.name}
          </option>
        ))}
      </select>
    </div>
  );
};
