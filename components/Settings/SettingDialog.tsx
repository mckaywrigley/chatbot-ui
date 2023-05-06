import { FC, useContext, useEffect, useReducer, useRef } from 'react';

import { useTranslation } from 'next-i18next';

import { useCreateReducer } from '@/hooks/useCreateReducer';

import { DEFAULT_SYSTEM_PROMPT } from '@/utils/app/const';
import { getSettings, saveSettings } from '@/utils/app/storage/settings';

import { Settings } from '@/types/settings';
import { SystemPrompt } from '@/types/systemPrompt';

import HomeContext from '@/pages/api/home/home.context';

interface Props {
  open: boolean;
  onClose: () => void;
}

export const SettingDialog: FC<Props> = ({ open, onClose }) => {
  const { t } = useTranslation('settings');

  const {
    state: { systemPrompts, user },
    dispatch: homeDispatch,
  } = useContext(HomeContext);
  const modalRef = useRef<HTMLDivElement>(null);

  const settings: Settings = getSettings(user);
  const { state, dispatch } = useCreateReducer<Settings>({
    initialState: settings,
  });
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

  const handleSave = () => {
    homeDispatch({ field: 'lightMode', value: state.theme });
    homeDispatch({
      field: 'defaultSystemPromptId',
      value: state.defaultSystemPromptId,
    });
    saveSettings(user, state);
  };

  const builtInSystemPrompt: SystemPrompt = {
    id: '0',
    name: 'Built-in',
    content: DEFAULT_SYSTEM_PROMPT,
  };
  const injectedSystemPrompts = [builtInSystemPrompt, ...systemPrompts];

  // Render nothing if the dialog is not open.
  if (!open) {
    return <></>;
  }

  // Render the dialog.
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="fixed inset-0 z-10 overflow-hidden">
        <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
          <div
            className="hidden sm:inline-block sm:h-screen sm:align-middle"
            aria-hidden="true"
          />

          <div
            ref={modalRef}
            className="dark:border-netural-400 inline-block max-h-[400px] transform overflow-y-auto rounded-lg border border-gray-300 bg-white px-4 pt-5 pb-4 text-left align-bottom shadow-xl transition-all dark:bg-[#202123] sm:my-8 sm:max-h-[600px] sm:w-full sm:max-w-lg sm:p-6 sm:align-middle"
            role="dialog"
          >
            <div className="text-lg pb-4 font-bold text-black dark:text-neutral-200">
              {t('Settings')}
            </div>

            <label className="mb-2 text-left text-neutral-900 dark:text-neutral-200">
              {t('Theme')}
            </label>
            <div className="mb-2 w-full rounded-lg border border-neutral-200 bg-transparent pr-2 text-neutral-900 dark:border-neutral-600 dark:text-white">
              <select
                className="w-full cursor-pointer bg-transparent p-2 text-neutral-700 dark:text-neutral-200"
                value={state.theme}
                onChange={(event) =>
                  dispatch({ field: 'theme', value: event.target.value })
                }
              >
                <option
                  value="dark"
                  className="dark:bg-[#343541] dark:text-white"
                >
                  {t('Dark mode')}
                </option>
                <option
                  value="light"
                  className="dark:bg-[#343541] dark:text-white"
                >
                  {t('Light mode')}
                </option>
              </select>
            </div>

            <label className="mb-2 text-left text-neutral-900 dark:text-neutral-200">
              {t('Default System Prompt')}
            </label>
            <div className="w-full rounded-lg border border-neutral-200 bg-transparent pr-2 text-neutral-900 dark:border-neutral-600 dark:text-white">
              <select
                className="w-full cursor-pointer bg-transparent p-2 text-neutral-700 dark:text-neutral-200"
                value={state.defaultSystemPromptId}
                onChange={(event) =>
                  dispatch({
                    field: 'defaultSystemPromptId',
                    value: event.target.value,
                  })
                }
              >
                {injectedSystemPrompts.map((systemPrompt) => (
                  <option
                    key={systemPrompt.id}
                    value={systemPrompt.id}
                    className="dark:bg-[#343541] dark:text-white"
                  >
                    {systemPrompt.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className="w-full px-4 py-2 mt-6 border rounded-lg shadow border-neutral-500 text-neutral-900 hover:bg-neutral-100 focus:outline-none dark:border-neutral-800 dark:border-opacity-50 dark:bg-white dark:text-black dark:hover:bg-neutral-300"
              onClick={() => {
                handleSave();
                onClose();
              }}
            >
              {t('Save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
