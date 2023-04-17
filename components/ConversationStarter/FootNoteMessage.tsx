import { FC, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { IconBold, IconBolt } from '@tabler/icons-react';

export const FootNoteMessage: FC = () => {
  const { t } = useTranslation('chat');

  return (
    <div className="px-3 pb-3 text-center text-[12px] text-black/50 dark:text-white/50 md:px-0 md:pb-6">
      <div className="leading-5">
        <a
          href="https://github.com/exploratortech/chat-everywhere"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          Chat Everywhere
        </a>{' '}
        by{' '}
        <a
          href="https://exploratorlabs.com"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          Explorator Labs
        </a>
        .
        <br />
        {t('Where the forefront of AI technology meets universal access.')}
      </div>
      <div className="mt-4 flex items-center justify-center rounded-md border border-neutral-200 dark:border-neutral-600 p-2">
      <span className="bg-blue-100 text-blue-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded dark:bg-blue-900 dark:text-blue-300">New</span>
      <span className="flex flex-row items-center justify-center flex-wrap leading-4">
        {t('Try out the new internet-connected enhance chat mode by clicking the')} {' '} <IconBolt size={17} stroke={2} /> {' '} {t('icon')}!
      </span>
      </div>
    </div>
  );
};
