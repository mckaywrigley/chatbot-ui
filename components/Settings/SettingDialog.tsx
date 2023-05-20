import { IconX } from '@tabler/icons-react';
import {
  FC,
  RefObject,
  createRef,
  useContext,
  useEffect,
  useReducer,
  useRef,
} from 'react';
import { useRecordHotkeys } from 'react-hotkeys-hook';

import { useTranslation } from 'next-i18next';

import { useCreateReducer } from '@/hooks/useCreateReducer';

import { getSettings, saveSettings } from '@/utils/app/settings';

import { HotkeySettings, Settings } from '@/types/settings';

import HomeContext from '@/pages/api/home/home.context';

interface Props {
  open: boolean;
  onClose: () => void;
}

interface HotkeyMenu {
  key: keyof HotkeySettings;
  name: string;
}
const hotkeyMenus = [
  { key: 'newConversation', name: 'New Conversation' },
  { key: 'focusChatInput', name: 'Focus Chat Input' },
  { key: 'deleteConversation', name: 'Delete Conversation' },
  { key: 'toggleChatBar', name: 'Toggle Chat Bar' },
  { key: 'togglePromptBar', name: 'Toggle Prompt Bar' },
] as HotkeyMenu[];

export const SettingDialog: FC<Props> = ({ open, onClose }) => {
  const { t } = useTranslation('settings');
  const settings: Settings = getSettings();
  const { state, dispatch } = useCreateReducer<Settings>({
    initialState: settings,
  });
  const { dispatch: homeDispatch } = useContext(HomeContext);
  const modalRef = useRef<HTMLDivElement>(null);
  const hotkeyRefs = useRef<RefObject<HTMLInputElement>[]>([]);
  hotkeyMenus.forEach(
    (_, i) => (hotkeyRefs.current[i] = createRef<HTMLInputElement>()),
  );

  const [keys, { start, stop, isRecording }] = useRecordHotkeys();

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

    // Convert hotkey meenus to object.
    const hotkeys = hotkeyMenus.reduce((acc, { key }, index) => {
      const ref = hotkeyRefs.current[index];
      const hotkey = ref.current?.value ?? '';
      return { ...acc, ...{ [key]: hotkey } };
    }, {} as HotkeySettings);
    dispatch({ field: 'hotkeys', value: hotkeys });
    homeDispatch({ field: 'hotkeys', value: hotkeys });

    saveSettings({ ...state, ...{ hotkeys } });
  };

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

            <div className="text-sm font-bold mb-2 text-black dark:text-neutral-200">
              {t('Theme')}
            </div>

            <select
              className="w-full cursor-pointer bg-transparent p-2 text-neutral-700 dark:text-neutral-200"
              value={state.theme}
              onChange={(event) =>
                dispatch({ field: 'theme', value: event.target.value })
              }
            >
              <option value="dark">{t('Dark mode')}</option>
              <option value="light">{t('Light mode')}</option>
            </select>

            <div className="text-sm font-bold my-2 text-black dark:text-neutral-200">
              {t('Hotkey settings')}
            </div>

            <table className="w-full table ">
              <tbody>
                {hotkeyMenus.map(({ key, name }, index) => {
                  return (
                    <tr key={key}>
                      <th className="text-sm font-bold p-2 text-black dark:text-neutral-200">
                        {t(name)}
                      </th>
                      <td>
                        <input
                          className="m-0 w-full rounded-md border bg-transparent p-2 text-black dark:bg-transparent dark:text-white"
                          defaultValue={state.hotkeys[key] ?? ''}
                          ref={hotkeyRefs.current[index]}
                          onFocus={() => {
                            start();
                          }}
                          onBlur={() => {
                            stop();
                          }}
                          onKeyUp={(e) => {
                            hotkeyRefs.current[index].current!.value =
                              Array.from(keys).join('+');
                            stop();
                            e.currentTarget.blur();
                          }}
                        />
                      </td>
                      <td>
                        <IconX
                          className="mx-auto min-w-[20px] text-black dark:text-neutral-200"
                          size={18}
                          onClick={(e) => {
                            e.stopPropagation();
                            hotkeyRefs.current[index].current!.value = '';
                          }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

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
