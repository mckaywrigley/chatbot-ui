import { FC, ReactElement, useRef, useState } from 'react';

import { useTranslation } from 'next-i18next';

import NAMES from '@/utils/app/names';

import Cookies from 'js-cookie';

interface Props {
  children: ReactElement;
  jarvisAuthCookie: string;
}

export const AuthDialog: FC<Props> = ({ children, jarvisAuthCookie }) => {
  const [jarvisAuth, setJarvisAuth] = useState(jarvisAuthCookie);

  const { t } = useTranslation('auth');

  const modalRef = useRef<HTMLDivElement>(null);

  if (jarvisAuthCookie) {
    return children;
  }

  const saveJarvisAuth = () => {
    Cookies.set(NAMES.COOKIES.AUTH, jarvisAuth || '');
    window.location.reload();
  };

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
              {t('Access Code')}
            </div>

            <input
              className="mt-2 w-full rounded-lg border border-neutral-500 px-4 py-2 text-neutral-900 shadow focus:outline-none dark:border-neutral-800 dark:border-opacity-50 dark:bg-[#40414F] dark:text-neutral-100"
              placeholder={t('Enter access code') || ''}
              type="password"
              value={jarvisAuth || ''}
              onChange={(e) => {
                setJarvisAuth(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  saveJarvisAuth();
                }
              }}
            />

            <button
              type="button"
              className="w-full px-4 py-2 mt-6 border rounded-lg shadow border-neutral-500 text-neutral-900 hover:bg-neutral-100 focus:outline-none dark:border-neutral-800 dark:border-opacity-50 dark:bg-white dark:text-black dark:hover:bg-neutral-300"
              onClick={() => {
                saveJarvisAuth();
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
