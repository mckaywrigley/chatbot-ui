import { FC, useContext } from 'react';

import { useTranslation } from 'next-i18next';

import { useCreateReducer } from '@/hooks/useCreateReducer';

import { getSettings, saveSettings } from '@/utils/app/settings';

import { Settings } from '@/types/settings';

import HomeContext from '@/pages/api/home/home.context';

import { TemperatureSlider } from '../Chat/Temperature';
import { Dialog } from '../Dialog/Dialog';

interface Props {
  open: boolean;
  onClose: () => void;
}

export const SettingDialog: FC<Props> = ({ open, onClose }) => {
  const { t } = useTranslation('settings');
  const settings: Settings = getSettings();
  const { state, dispatch } = useCreateReducer<Settings>({
    initialState: settings,
  });
  const { dispatch: homeDispatch } = useContext(HomeContext);

  const handleSave = () => {
    homeDispatch({ field: 'lightMode', value: state.theme });
    saveSettings(state);
  };

  // Render the dialog.
  return (
    <Dialog open={open} onClose={() => onClose()}>
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

      <div className="text-sm font-bold mt-2 mb-2 text-black dark:text-neutral-200">
        {t('Temperature')}
      </div>

      <TemperatureSlider
        onChangeTemperature={(temperature) =>
          dispatch({ field: 'defaultTemperature', value: temperature })
        }
      />

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
    </Dialog>
  );
};
