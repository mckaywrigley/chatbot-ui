import { Dialog, Transition } from '@headlessui/react';
import { FC, Fragment, useContext } from 'react';
import { useTranslation } from 'next-i18next';
import { Session } from '@supabase/supabase-js';
import HomeContext from '@/pages/api/home/home.context';

type Props = {
  onClose: () => void;
  session: Session;
};

export const ProfileModel: FC<Props> = ({ onClose, session }) => {
  const { t } = useTranslation('models');
  const {
    handleUserLogout
  } = useContext(HomeContext);

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
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl p-6 text-left align-middle shadow-xl transition-all bg-neutral-800 text-white">
                <Dialog.Description>
                  {t('Thank you for registering with us. We are currently working on the some exiting features. Please check back soon!')}
                </Dialog.Description>

                <div>
                  <button
                    type="button"
                    className="w-full px-4 py-2 mt-6 border rounded-lg shadow border-neutral-500 text-neutral-200 hover:bg-neutral-700 focus:outline-none"
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
