import { Dialog, Transition } from '@headlessui/react';
import { IconX } from '@tabler/icons-react';
import React, { Fragment, memo, useEffect, useRef, useState } from 'react';

import { useTranslation } from 'next-i18next';

import { ChatEverywhereFeatures } from '@/types/notion';

import Spinner from '../Spinner/Spinner';
import FeaturesPage from './FeaturePage';
import TierTag from './TierTag';

import dayjs from 'dayjs';

function formatDatetime(dateString: string) {
  return dayjs(dateString).format('YYYY/MM/DD' + ' ' + 'HH:mm');
}

type Props = {
  className?: string;
  open: boolean;
  onClose: () => void;
};

const FeaturesModel = memo(({ className = '', open, onClose }: Props) => {
  const { t } = useTranslation('features');

  const [featuresList, setFeaturesList] = useState<ChatEverywhereFeatures[]>(
    [],
  );
  const observerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectPageId, setSelectedPageId] = useState<string | null>(null);

  const changeSelectPageId = (pageId: string) => {
    setSelectedPageId(pageId);
  };

  const { i18n } = useTranslation();

  const fetchLatestFeatures = async () => {
    setIsLoading(true);
    try {
      const url = new URL('/api/notion/features', window.location.origin);
      if (/^zh/.test(i18n.language)) url.searchParams.append('lang', 'zh');
      const response = await fetch(url);
      const { featuresList } = await response.json();
      setFeaturesList(featuresList);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLatestFeatures();
  }, []);

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog
        as="div"
        className={`${className} relative z-50`}
        onClose={onClose}
        open={open}
      >
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
          <div className="flex min-h-full items-center justify-center text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-3xl tablet:max-w-[90vw] h-[80vh] transform overflow-hidden rounded-2xl p-6 text-left align-middle shadow-xl transition-all bg-neutral-800 text-neutral-200 grid grid-rows-[max-content_1fr] mobile:h-screen mobile:!max-w-[unset] mobile:!rounded-none">
                <div className="mb-3 flex flex-row justify-between items-center">
                  <h1>{t('Feature Introduction')}</h1>

                  {!selectPageId ? (
                    <button className="w-max min-h-[34px]" onClick={onClose}>
                      <IconX></IconX>
                    </button>
                  ) : (
                    <button
                      className="w-max px-4 py-1 border rounded-lg shadow focus:outline-none border-neutral-800 border-opacity-50 bg-white text-black hover:bg-neutral-300 "
                      onClick={() => setSelectedPageId(null)}
                    >
                      Back
                    </button>
                  )}
                </div>

                <ul
                  className={`${
                    selectPageId || isLoading ? 'hidden' : ''
                  } overflow-y-auto list-outside list-disc cursor-pointer`}
                >
                  {featuresList.map((featureItem, index) => (
                    <li
                      className="mb-3 hover:bg-black/50 p-3 rounded-md"
                      key={`${featureItem.id} ${index}`}
                      onClick={() => setSelectedPageId(featureItem.id)}
                    >
                      <div className="flex gap-2 justify-between">
                        <h3 className="text-sm font-medium leading-5">
                          {featureItem.title}{' '}
                          {featureItem.tier.length > 0 &&
                            featureItem.tier.map((tier) => (
                              <TierTag
                                key={`${featureItem.id} ${index} ${tier}`}
                                tier={tier}
                              />
                            ))}
                        </h3>
                        <label className="italic text-sm">
                          {formatDatetime(featureItem.lastEditedTime)}
                        </label>
                      </div>
                    </li>
                  ))}

                  <div className="h-1" ref={observerRef}></div>
                </ul>

                {selectPageId && (
                  <FeaturesPage
                    pageId={selectPageId}
                    internalLinkOnClick={changeSelectPageId}
                  />
                )}
                {isLoading && (
                  <div className="flex mt-[50%]">
                    <Spinner size="16px" className="mx-auto" />
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
});

FeaturesModel.displayName = 'FeaturesModel ';

export default FeaturesModel;
