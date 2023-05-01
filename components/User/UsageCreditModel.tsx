import { Dialog, Transition } from '@headlessui/react';
import { FC, Fragment, useContext, useEffect, useMemo, useState } from 'react';

import { useTranslation } from 'next-i18next';

import { DefaultMonthlyCredits } from '@/utils/config';

import { PluginID } from '@/types/plugin';

import HomeContext from '@/pages/api/home/home.context';

import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs';

type Props = {
  onClose: () => void;
};

export const UsageCreditModel: FC<Props> = ({ onClose }) => {
  const { t } = useTranslation('model');
  const [gpt4Credit, setGpt4Credit] = useState<number | null>(null);

  const {
    state: { user },
  } = useContext(HomeContext);

  const supabaseClient = useMemo(() => createBrowserSupabaseClient(), []);

  const userId = user?.id;

  useEffect(() => {
    if (!userId || !supabaseClient) return;

    const fetchUserCredits = async () => {
      console.log('Fetching user credits');

      const { data, error } = await supabaseClient
        .from('user_credits')
        .select('*')
        .eq('user_id', userId)
        .eq('api_type', PluginID.GPT4);

      if (error) {
        console.error(error);
      } else {
        setGpt4Credit(data[0].balance);
      }
    };

    fetchUserCredits();
  }, []);

  return (
    <Transition appear show={true} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose} open>
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl p-6 text-left align-middle shadow-xl transition-all bg-neutral-800 text-neutral-200">
                <div className="mb-3">
                  {t('As a Pro plan customer, you will receive credits every month to use our plugins.')}
                </div>

                <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
                  <table className="w-full text-sm text-gray-500 dark:text-gray-400 text-center">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                      <tr>
                        <th scope="col" className="px-6 py-3">
                          {t('Plugin')}
                        </th>
                        <th scope="col" className="px-6 py-3">
                          {t('Monthly credit')}
                        </th>
                        <th scope="col" className="px-6 py-3">
                          {t('Balance')}
                        </th>
                        <th scope="col" className="px-6 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="bg-white border-b dark:bg-gray-900 dark:border-gray-700">
                        <th
                          scope="row"
                          className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white"
                        >
                          GPT-4
                        </th>
                        <td className="px-6 py-4">{DefaultMonthlyCredits[PluginID.GPT4]}</td>
                        <td className="px-6 py-4">{gpt4Credit}</td>
                        <td className="px-6 py-4">
                          <a
                            href="#"
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-blue-600 dark:text-blue-500 hover:underline"
                          >
                            Buy more credit
                          </a>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
