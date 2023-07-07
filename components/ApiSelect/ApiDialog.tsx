import { FC, useContext, useEffect, useRef } from 'react';

import { useTranslation } from 'next-i18next';

import { Models } from '@/utils/config/models';

import HomeContext from '@/pages/api/home/home.context';

import { Dialog } from '../Dialog';
import { Key } from './Key';

interface Props {
  open: boolean;
  onClose: () => void;
}

export const ModelDialog: FC<Props> = ({ open, onClose }) => {
  const { t } = useTranslation('API');
  const {
    dispatch: homeDispatch,
    state: { api },
  } = useContext(HomeContext);

  return (
    <Dialog onClose={onClose} open={open}>
      <div className="text-lg pb-4 font-bold text-black dark:text-neutral-200">
        {t('Choose from available APIs')}
      </div>
      <div className="space-y-2">
        <div>
          <div className="text-sm font-bold mb-2 text-black dark:text-neutral-200">
            {t('API')}
          </div>
          <select
            className="w-full cursor-pointer bg-transparent p-2 dark:text-neutral-200 text-black"
            value={api}
            onChange={(event) =>
              homeDispatch({ field: 'api', value: event.target.value })
            }
          >
            {Models ? (
              Models?.map((api) => (
                <option key={api.id} value={api.id} className="text-black">
                  {t(api.name)}
                </option>
              ))
            ) : (
              <option>No models available</option>
            )}
          </select>
        </div>
        <div>
          <div className="text-sm font-bold mb-2 text-black dark:text-neutral-200">
            {t('Key')}
          </div>
          <Key />
        </div>
      </div>
      <button
        type="button"
        className="w-full px-4 py-2 mt-6 border rounded-lg shadow border-neutral-500 text-neutral-900 hover:bg-neutral-100 focus:outline-none dark:border-neutral-800 dark:border-opacity-50 dark:bg-white dark:text-black dark:hover:bg-neutral-300"
        onClick={() => {
          onClose();
        }}
      >
        {t('Done')}
      </button>
    </Dialog>
  );
};
