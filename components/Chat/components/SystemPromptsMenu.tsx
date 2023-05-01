import { IconPlus } from '@tabler/icons-react';
import {
  FC,
  KeyboardEvent,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { useTranslation } from 'next-i18next';

import { SystemPrompt } from '@/types/systemPrompt';

import HomeContext from '@/pages/api/home/home.context';

import { SystemPromptComponent } from './SystemPromptComponent';

interface Props {
  systemPrompts: SystemPrompt[];
  onClose: () => void;
}

export const SystemPromptsMenu: FC<Props> = ({ systemPrompts, onClose }) => {
  const { t } = useTranslation('systemPrompt');
  const { handleCreateSystemPrompt } = useContext(HomeContext);

  const modalRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const handleEnter = (e: KeyboardEvent<HTMLDivElement>) => {};

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        window.addEventListener('mouseup', handleMouseUp);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      window.removeEventListener('mouseup', handleMouseUp);
      onClose();
    };

    window.addEventListener('mousedown', handleMouseDown);

    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
    };
  }, [onClose]);

  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
      onKeyDown={handleEnter}
    >
      <div className="fixed inset-0 z-10 overflow-hidden">
        <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
          <div
            className="hidden sm:inline-block sm:h-screen sm:align-middle"
            aria-hidden="true"
          />

          <div
            ref={modalRef}
            className="dark:border-netural-400 inline-block rounded-lg border border-gray-300 bg-white px-4 pt-5 pb-4 text-left align-bottom shadow-xl transition-all dark:bg-[#202123] sm:my-8 sm:w-full sm:max-w-lg sm:p-6 sm:align-middle"
            role="dialog"
          >
            <div className="text-lg pb-4 font-bold text-black dark:text-neutral-200">
              {'System Prompts'}
            </div>

            <button
              className="text-sidebar flex w-[190px] flex-shrink-0 cursor-pointer select-none items-center gap-3 rounded-md border border-black/20 p-3 text-black transition-colors duration-200
               hover:bg-gray-500/10 dark:text-neutral-200 dark:border-white/20"
              onClick={handleCreateSystemPrompt}
            >
              <IconPlus size={16} />
              {t('New System Prompt')}
            </button>

            <div className="dark:border-netural-400 inline-block max-h-[300px] overflow-y-auto rounded-lg border border-gray-300 bg-white px-4 pt-5 pb-4 text-left align-bottom transition-all dark:bg-[#282a2c] sm:my-4 sm:max-h-[500px] sm:w-full sm:max-w-lg sm:p-2 sm:align-middle">
              <div className="flex w-full flex-col gap-1">
                {systemPrompts.map((systemPrompt, index) => (
                  <SystemPromptComponent
                    key={index}
                    systemPrompt={systemPrompt}
                  />
                ))}
              </div>
            </div>

            <button
              type="button"
              className="w-full px-4 py-2 mt-6 border rounded-lg shadow border-neutral-500 text-neutral-900 hover:bg-neutral-100 focus:outline-none dark:border-neutral-800 dark:border-opacity-50 dark:bg-white dark:text-black dark:hover:bg-neutral-300"
              onClick={() => {
                onClose();
              }}
            >
              {t('Continue')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
