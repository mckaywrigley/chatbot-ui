import { FC, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { SamplePrompts } from './SamplePrompts';
import { RolePlayPrompts } from './RolePlayPrompts';
import { event } from 'nextjs-google-analytics';
import { FootNoteMessage } from './FootNoteMessage';

type Props = {
  promptOnClick: (prompt: string) => void;
};

export const NewConversationMessagesContainer: FC<Props> = ({
  promptOnClick,
}) => {
  const { t } = useTranslation('chat');
  const [rolePlayMode, setRolePlayMode] = useState(true);

  const switchButtonOnClick = () => {
    setRolePlayMode(!rolePlayMode);
  }

  const roleOnClick = (roleName: string, roleContent: string) => {
    promptOnClick(roleContent);

    event("interaction", {
      category: "New Conversation",
      label: roleName,
    });
  }

  return (
    <div className="font-normal">
      <span className="font-semibold">Chat Everywhere</span>
      {
        rolePlayMode ? (
          <RolePlayPrompts roleOnClick={roleOnClick}/>
        ): (
          <SamplePrompts promptOnClick={promptOnClick} />
        )
      }
      <button className="border border-neutral-600 hover:bg-gray-200 text-gray-800 py-2 px-4 rounded-md text-sm mb-3 dark:text-gray-100 dark:hover:bg-transparent" onClick={switchButtonOnClick}>
        {rolePlayMode ? t('Switch to Sample Prompts') : t('Switch to Role Play')}
      </button>
      <FootNoteMessage />
    </div>
  );
};
