import { IconDeviceLaptop } from '@tabler/icons-react';
import { FC, useContext, useState } from 'react';

import { useTranslation } from 'next-i18next';

import { DEFAULT_SYSTEM_PROMPT } from '@/utils/app/const';

import { SystemPrompt } from '@/types/systemPrompt';

import HomeContext from '@/pages/api/home/home.context';

import { SystemPromptsMenu } from './components/SystemPromptsMenu';

interface Props {
  systemPrompts: SystemPrompt[];
}

export const SystemPromptSection: FC<Props> = ({ systemPrompts }) => {
  const { t } = useTranslation('systemPrompt');

  const [showModal, setShowModal] = useState(false);

  const {
    state: { selectedConversation, defaultSystemPromptId },
    handleUpdateConversation,
  } = useContext(HomeContext);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const content = injectedSystemPrompts.filter(
      (prompt) => prompt.id === e.target.value,
    )[0].content;

    selectedConversation &&
      handleUpdateConversation(selectedConversation, {
        key: 'prompt',
        value: content,
      });
  };

  const builtInSystemPrompt: SystemPrompt = {
    id: '0',
    name: 'Built-in',
    content: DEFAULT_SYSTEM_PROMPT,
  };
  const injectedSystemPrompts = [builtInSystemPrompt, ...systemPrompts];

  const conversationPromptId =
    injectedSystemPrompts.filter(
      (prompt) => prompt.content === selectedConversation?.prompt,
    )[0]?.id || builtInSystemPrompt.id;

  return (
    <div className="flex flex-col">
      <label className="mb-2 text-left text-neutral-700 dark:text-neutral-400">
        {'System Prompt'}
      </label>
      <div className="w-full rounded-lg border border-neutral-200 bg-transparent pr-2 text-neutral-900 dark:border-neutral-600 dark:text-white">
        <select
          className="w-full bg-transparent p-2"
          placeholder={'Select a prompt'}
          onChange={handleChange}
          value={conversationPromptId}
        >
          {injectedSystemPrompts.map((systemPrompt) => (
            <option
              key={systemPrompt.id}
              value={systemPrompt.id}
              className="dark:bg-[#343541] dark:text-white"
            >
              {systemPrompt.id === defaultSystemPromptId
                ? `${t('Default')} (${systemPrompt.name})`
                : systemPrompt.name}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={() => {
          setShowModal(!showModal);
        }}
        className="w-full mt-3 text-left text-neutral-700 dark:text-neutral-400 flex items-center"
      >
        <IconDeviceLaptop size={18} className={'inline mr-1'} />
        {t('Configure System Prompts')}
      </button>

      {showModal && (
        <SystemPromptsMenu
          onClose={() => setShowModal(false)}
          systemPrompts={systemPrompts}
        />
      )}
    </div>
  );
};
