import { Conversation } from '@/types';
import { DEFAULT_SYSTEM_PROMPT } from '@/utils/app/const';
import { FC, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'next-i18next';

interface Props {
  conversation: Conversation;
  onChangePrompt: (prompt: string) => void;
}

export const SystemPrompt: FC<Props> = ({ conversation, onChangePrompt }) => {
  const { t } = useTranslation('chat');
  const [value, setValue] = useState<string>('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const maxLength = 4000;

    if (value.length > maxLength) {
      alert(t(`Prompt limit is {{maxLength}} characters`, { maxLength }));
      return;
    }

    setValue(value);

    if (value.length > 0) {
      onChangePrompt(value);
    }
  };

  useEffect(() => {
    if (textareaRef && textareaRef.current) {
      textareaRef.current.style.height = 'inherit';
      textareaRef.current.style.height = `${textareaRef.current?.scrollHeight}px`;
    }
  }, [value]);

  useEffect(() => {
    if (conversation.prompt) {
      setValue(conversation.prompt);
    } else {
      setValue(DEFAULT_SYSTEM_PROMPT);
    }
  }, [conversation]);

  return (
    <div className="flex flex-col">
      <label className="mb-2 text-left text-neutral-700 dark:text-neutral-400">
        {t('System Prompt')}
      </label>
      <textarea
        ref={textareaRef}
        className="w-full rounded-lg border border-neutral-500 px-4 py-2 text-neutral-900 shadow focus:outline-none dark:border-neutral-800 dark:border-opacity-50 dark:bg-[#40414F] dark:text-neutral-100"
        style={{
          resize: 'none',
          bottom: `${textareaRef?.current?.scrollHeight}px`,
          maxHeight: '300px',
          overflow: `${
            textareaRef.current && textareaRef.current.scrollHeight > 400
              ? 'auto'
              : 'hidden'
          }`,
        }}
        placeholder={t('Enter a prompt') || ''}
        value={t(value) || ''}
        rows={1}
        onChange={handleChange}
      />
    </div>
  );
};
