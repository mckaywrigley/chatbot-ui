import { Dialog, Transition } from '@headlessui/react';
import React, {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { useTranslation } from 'next-i18next';

import { ChatEverywhereNews } from '@/types/notion';

type Props = {
  onClose: () => void;
};

function NewsModel({ onClose }: Props) {
  const { t } = useTranslation('news');

  const [newsList, setNewsList] = useState<ChatEverywhereNews[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const observerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchMoreNews = useCallback(async (nextCursor?: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/notion/newsList?startCursor=${nextCursor || ''}`,
      );
      const { newsList, nextCursor: newNextCursor } = await response.json();
      setNewsList((prevNewsList) => [...prevNewsList, ...newsList]);
      setNextCursor(newNextCursor);
    } finally {
      setIsLoading(false);
    }
  }, []);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isLoading && nextCursor) {
          fetchMoreNews(nextCursor);
        }
      },
      { rootMargin: '0px 0px 100% 0px' }, // trigger when element is 100% visible
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => {
      if (observerRef.current) {
        observer.unobserve(observerRef.current);
      }
    };
  }, [fetchMoreNews, isLoading, nextCursor]);

  useEffect(() => {
    fetchMoreNews(undefined);
  }, [fetchMoreNews]);

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
              <Dialog.Panel className="w-full max-w-3xl tablet:max-w-[90vw] transform overflow-hidden rounded-2xl p-6 text-left align-middle shadow-xl transition-all bg-neutral-800 text-neutral-200">
                <h1 className="mb-3">{t('Latest Updates')}</h1>
                <ul className="max-h-[40rem] tablet:max-h-[70vh] overflow-y-auto">
                  {newsList.map((news, index) => (
                    <li className="mb-3" key={`${news.id} ${index}`}>
                      <h2 className="font-bold">{news.title}</h2>
                      <p>{news.id}</p>
                      <p>{news.createdTime}</p>
                    </li>
                  ))}
                  {isLoading && <div>Loading...</div>}
                  <div className="h-1" ref={observerRef}></div>
                </ul>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

export default NewsModel;
