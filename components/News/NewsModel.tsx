import { Dialog, Transition } from '@headlessui/react';
import { IconX } from '@tabler/icons-react';
import React, {
  Fragment,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useTranslation } from 'next-i18next';

import { ChatEverywhereNews } from '@/types/notion';

import Spinner from '../Spinner/Spinner';
import NewsPage from './NewsPage';

import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

function formatDatetime(dateString: string) {
  return dayjs(dateString).fromNow();
}

type Props = {
  className?: string;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
};

const NewsModel = memo(({ className = '', open, onOpen, onClose }: Props) => {
  const { t } = useTranslation('news');

  const [newsList, setNewsList] = useState<ChatEverywhereNews[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const observerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectPageId, setSelectedPageId] = useState<string | null>(null);
  const latestNewsId = useMemo(() => newsList[0]?.id, [newsList]);

  const fetchMoreNews = useCallback(async (nextCursor?: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/notion/news?startCursor=${nextCursor || ''}`,
      );
      const { newsList, nextCursor: newNextCursor } = await response.json();
      setNewsList((prevNewsList) => {
        const newList = [...prevNewsList, ...(newsList || [])];

        // remove duplicate by its id in the list, avoid confusion when in dev mode
        const uniqueList = newList.filter(
          (news, index, self) =>
            index === self.findIndex((t) => t.id === news.id),
        );

        return uniqueList;
      });
      setNextCursor(newNextCursor);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!latestNewsId) return;

    const latestNewsIdInLocalStorage = readLatestNewsIdFromLocalStorage();
    if (latestNewsId !== latestNewsIdInLocalStorage) {
      onOpen();
      storeLatestNewsIdToLocalStorage(latestNewsId);
    }
  }, [latestNewsId, onOpen]);

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

  useEffect(() => {
    if (open && newsList.length > 0) {
      setSelectedPageId(newsList[0].id);
    }
  }, [newsList, open]);

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
                  <h1>{t('Latest Updates')}</h1>

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
                  } overflow-y-auto`}
                >
                  {newsList.map((news, index) => (
                    <li
                      className="mb-3 hover:bg-black/50 p-3 rounded-md"
                      key={`${news.id} ${index}`}
                      onClick={() => setSelectedPageId(news.id)}
                    >
                      <h3 className="text-sm font-medium leading-5">
                        {news.title}
                      </h3>
                      <p>{formatDatetime(news.createdTime)}</p>
                    </li>
                  ))}

                  <div className="h-1" ref={observerRef}></div>
                </ul>

                {selectPageId && <NewsPage pageId={selectPageId} />}
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

NewsModel.displayName = 'NewsModel';

export default NewsModel;

function storeLatestNewsIdToLocalStorage(id: string) {
  localStorage.setItem('latestNewsId', id);
}

function readLatestNewsIdFromLocalStorage() {
  return localStorage.getItem('latestNewsId');
}
