import { FC, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { SamplePrompts } from './SamplePrompts';

type Props = {
  promptOnClick: (prompt: string) => void;
};

const FootNoteMessage: FC = () => {
  const { t } = useTranslation('chat');

  return (
    <div className="px-3 pb-3 text-center text-[12px] text-black/50 dark:text-white/50 md:px-4 md:pb-6">
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
    </div>
  );
};

export const NewConversationMessagesContainer: FC<Props> = ({
  promptOnClick,
}) => {
  const { t } = useTranslation('prompts');
  const [rolePlayMode, setRolePlayMode] = useState(false);

  return (
    <div>
      <span className="font-semibold">Chat Everywhere</span>
      <SamplePrompts promptOnClick={promptOnClick} />
      <FootNoteMessage />
    </div>
  );
};
