import React, { useContext, useState } from 'react';

import { DEFAULT_MODEL } from '@/utils/app/const';

import { Model } from '@/types/chat';

import HomeContext from '@/pages/api/home/home.context';

const ModelSelector = ({
  onChangeModel,
}: {
  onChangeModel: (model: Model) => void;
}) => {
  const {
    state: { conversations },
  } = useContext(HomeContext);

  const lastConversation = conversations[conversations.length - 1];

  const [value, setValue] = useState<Model>(
    lastConversation?.modelId || DEFAULT_MODEL,
  );

  const handleOnChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = event.target.value as unknown as Model;
    setValue(newValue);
    onChangeModel(newValue);
  };

  return (
    <div className="flex justify-between items-center">
      <label htmlFor="model" className="text-gray-700 dark:text-gray-400">
        Select Model
      </label>
      <select
        name="model"
        id="model"
        className="bg-transparent px-3 py-1 border border-gray-500 rounded"
        onChange={handleOnChange}
        value={value}
      >
        {Object.values(Model)
          .filter((value) => typeof value === 'string')
          .map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
      </select>
    </div>
  );
};

export default ModelSelector;
