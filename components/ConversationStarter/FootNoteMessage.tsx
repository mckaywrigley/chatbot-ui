import { FC, useContext } from 'react';
import { useTranslation } from 'next-i18next';
import { IconBolt } from '@tabler/icons-react';

export const FootNoteMessage: FC = () => {
  const { t } = useTranslation('chat');

  return (
    <div className="px-3 pb-3 text-center text-[12px] text-black/50 dark:text-white/50 md:px-0 md:pb-6">
      <div className="leading-5">
        <a
          href="https://intro.chateverywhere.app"
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

      {/* Promote enhance chat mode */}
      <div className="mt-4 flex items-center justify-center rounded-md border border-neutral-200 p-2 dark:border-neutral-600">
        <span className="flex flex-row flex-wrap items-center justify-center leading-4">
          {t(
            'Try out the new internet-connected enhance chat mode by clicking the',
          )}{' '}
          <IconBolt size={17} stroke={2} /> {t('icon')}!
        </span>
      </div>
    </div>
  );
};
