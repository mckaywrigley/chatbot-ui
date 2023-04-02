import { FC } from 'react';
import { useTranslation } from 'next-i18next';

type Props = {};

export const NewConversationMessagesContainer: FC<Props> = () => {
  const { t } = useTranslation('chat');
  return (
    <div>
      <span className="font-semibold">Chat Everywhere</span>
      <div className="px-3 pt-2 pb-3 text-center text-[12px] text-black/50 dark:text-white/50 md:px-4 md:pt-3 md:pb-6">
        <div className="whitespace-nowrap">
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
          . {t('Where the forefront of AI technology meets universal access.')}
        </div>
      </div>
    </div>
  );
};
