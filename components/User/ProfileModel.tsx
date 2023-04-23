import { Dialog, Transition } from '@headlessui/react';
import { FC, Fragment, useContext } from 'react';

import { useTranslation } from 'next-i18next';

import HomeContext from '@/pages/api/home/home.context';

import { Session } from '@supabase/supabase-js';

import { IconCheck } from '@tabler/icons-react';

type Props = {
  onClose: () => void;
  session: Session;
};

const PlanDetail = {
  free: {
    features: [
      '100 messages per week',
      'Reduced response time',
      'Share conversations',
    ],
  },
  pro: {
    features: [
      'Everything in free plan',
      'Unlimited messages',
      'Priority response time',
      'Cloud sync',
      'Voice input (Coming)',
      'GPT-4 integration (Coming)'
    ],
  },
};

const FeatureItem = ({ feature }: { feature: string }) => {
  return (
    <div className="flex flex-row items-center">
      <IconCheck size={16} stroke={1} className="mr-1" color='lightgreen'/>
      <span>{feature}</span>
    </div>
  );
};

export const ProfileModel: FC<Props> = ({ onClose }) => {
  const { t } = useTranslation('model');
  const { handleUserLogout } = useContext(HomeContext);

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
              <Dialog.Panel className="w-full max-w-md md:max-w-lg transform overflow-hidden rounded-2xl p-6 text-left align-middle shadow-xl transition-all bg-neutral-800 text-white">
                <Dialog.Description>
                  <div className="rounded-2xl flex flex-col">
                    <span className="text-sm mb-6">
                      {t(
                        'As an effort to reach sustainability for Chat Everywhere, we are introducing pro plan for our users to support us and this project, so we can continue to provide you with the best feature and experience.',
                      )}
                    </span>
                    <div className="flex flex-col md:flex-row justify-evenly mb-3">
                      <div className="flex flex-col border rounded-2xl p-4 text-neutral-400 border-neutral-400">
                        <span className="text-2xl font-bold">Free</span>
                        <span className="text-sm mb-2">USD$0</span>
                        <div className="text-xs leading-5">
                          {PlanDetail.free.features.map((feature, index) => (
                            <FeatureItem key={index} feature={feature} />
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col border rounded-2xl p-4 mt-4 md:mt-0 md:ml-2">
                        <span className="text-2xl font-bold">Pro</span>
                        <span className="text-sm mb-2">USD$9.99</span>
                        <div className="text-xs leading-5">
                          {PlanDetail.pro.features.map((feature, index) => (
                            <FeatureItem key={index} feature={feature} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </Dialog.Description>

                <div className="flex justify-between mt-4">
                  <button
                    type="button"
                    className="px-4 py-2 border rounded-lg shadow text-black bg-slate-200 hover:bg-slate-300 focus:outline-none"
                    onClick={onClose}
                  >
                    {t('Okay')}
                  </button>

                  <button
                    type="button"
                    className="px-4 py-2 border rounded-lg shadow border-neutral-500 text-neutral-200 hover:bg-neutral-700 focus:outline-none"
                    onClick={handleUserLogout}
                  >
                    {t('Sign Out')}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
