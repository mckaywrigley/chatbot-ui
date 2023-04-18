import { FC, useEffect, useRef } from 'react';

import { useTranslation } from 'next-i18next';

import { ChatMode, ChatModeList } from '@/types/chatmode';

interface Props {
  chatMode: ChatMode;
  onChatModeChange: (chatMode: ChatMode) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLSelectElement>) => void;
}

export const ChatModeSelect: FC<Props> = ({
  chatMode,
  onChatModeChange,
  onKeyDown,
}) => {
  const { t } = useTranslation('chat');

  const selectRef = useRef<HTMLSelectElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLSelectElement>) => {
    const selectElement = selectRef.current;
    const optionCount = selectElement?.options.length || 0;

    if (e.key === '/' && e.metaKey) {
      e.preventDefault();
      if (selectElement) {
        selectElement.selectedIndex =
          (selectElement.selectedIndex + 1) % optionCount;
        selectElement.dispatchEvent(new Event('change'));
      }
    } else if (e.key === '/' && e.shiftKey && e.metaKey) {
      e.preventDefault();
      if (selectElement) {
        selectElement.selectedIndex =
          (selectElement.selectedIndex - 1 + optionCount) % optionCount;
        selectElement.dispatchEvent(new Event('change'));
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectElement) {
        selectElement.dispatchEvent(new Event('change'));
      }

      onChatModeChange(
        ChatModeList.find(
          (plugin) =>
            plugin.name === selectElement?.selectedOptions[0].innerText,
        ) as ChatMode,
      );
    } else {
      onKeyDown(e);
    }
  };

  useEffect(() => {
    if (selectRef.current) {
      selectRef.current.focus();
    }
  }, []);

  return (
    <div className="flex flex-col">
      <div className="mb-1 w-full rounded border border-neutral-200 bg-transparent pr-2 text-neutral-900 dark:border-neutral-600 dark:text-white">
        <select
          ref={selectRef}
          className="w-full cursor-pointer bg-transparent p-2"
          placeholder={t('Select a plugin') || ''}
          value={chatMode?.id || ''}
          onBlur={(e) => {
            onChatModeChange(
              ChatModeList.find(
                (plugin) => plugin.id === e.target.value,
              ) as ChatMode,
            );
          }}
          onChange={(e) => {
            onChatModeChange(
              ChatModeList.find(
                (plugin) => plugin.id === e.target.value,
              ) as ChatMode,
            );
          }}
          onKeyDown={(e) => {
            handleKeyDown(e);
          }}
        >
          {ChatModeList.map((plugin) => (
            <option
              key={plugin.id}
              value={plugin.id}
              className="dark:bg-[#343541] dark:text-white"
            >
              {plugin.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
