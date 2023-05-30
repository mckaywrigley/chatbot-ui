import { FC, useContext, useState } from 'react';

import { useTranslation } from 'next-i18next';
import { event } from 'nextjs-google-analytics';

import HomeContext from '@/pages/api/home/home.context';

import { FootNoteMessage } from './FootNoteMessage';
import { RolePlayPrompts } from './RolePlayPrompts';
import { SamplePrompts } from './SamplePrompts';

type Props = {
  promptOnClick: (prompt: string) => void;
};

export const NewConversationMessagesContainer: FC<Props> = ({
  promptOnClick,
}) => {
  const { t } = useTranslation('chat');
  const {
    state: { user, isSurveyFilled },
    dispatch,
  } = useContext(HomeContext);

  const [rolePlayMode, setRolePlayMode] = useState(true);

  const switchButtonOnClick = () => {
    setRolePlayMode(!rolePlayMode);
  };

  const roleOnClick = (roleName: string, roleContent: string) => {
    promptOnClick(roleContent);

    event('interaction', {
      category: 'New Conversation',
      label: roleName,
    });
  };

  const bannerOnClick = () => {
    if (user) {
      dispatch({ field: 'showProfileModel', value: true });
    } else {
      dispatch({ field: 'showLoginSignUpModel', value: true });
    }

    event('Support banner clicked', {
      category: 'Engagement',
      label: 'Banner',
    });
  };

  const surveyOnClick = () => {
    dispatch({ field: 'showSurveyModel', value: true });

    event('Survey banner clicked', {
      category: 'Engagement',
      label: 'survey_banner',
    });
  };
  const featureOnClick = () => {
    dispatch({ field: 'showFeaturesModel', value: true });
    event('Feature banner clicked', {
      category: 'Engagement',
      label: 'feature_introduction_banner',
    });
  };

  return (
    <div className="font-normal">
      <span className="font-semibold">Chat Everywhere</span>

      {/* Ask for support banner */}
      {(!user || user?.plan === 'free') && (
        <div
          className="mt-4 flex items-center justify-center rounded-md border border-neutral-200 p-2 dark:border-neutral-600 bg-gradient-to-r from-[#ff80b5] to-[#9089fc] cursor-pointer"
          onClick={bannerOnClick}
        >
          <span className="flex flex-row flex-wrap items-center justify-center leading-4 text-sm">
            {t(
              'If you like this project, please support us by subscripting to our Pro plan!',
            )}
          </span>
        </div>
      )}

      {/* Feature Introduction Popup */}
      <div
        className="mt-4 flex items-center justify-center rounded-md border border-neutral-200 p-2 dark:border-neutral-600 dark:bg-none cursor-pointer"
        onClick={featureOnClick}
      >
        <span className="bg-yellow-100 text-yellow-800 text-xs font-medium ml-2 mr-2 px-2.5 py-0.5 rounded dark:bg-yellow-800 dark:text-yellow-300">
          New
        </span>
        <span className="flex flex-row flex-wrap items-center justify-center leading-4 text-sm">
          {t('Check out out new features page!')}
        </span>
      </div>

      {/* Survey for user information */}
      {!isSurveyFilled && (
        <div
          className="mt-4 flex items-center justify-center rounded-md border border-neutral-200 p-2 dark:border-neutral-600 dark:bg-none cursor-pointer"
          onClick={surveyOnClick}
        >
          <span className="bg-yellow-100 text-yellow-800 text-xs font-medium ml-2 mr-2 px-2.5 py-0.5 rounded dark:bg-yellow-800 dark:text-yellow-300">
            New
          </span>
          <span className="flex flex-row flex-wrap items-center justify-center leading-4 text-sm">
            {t('Please share your thoughts by completing a brief survey.')}
          </span>
        </div>
      )}

      {rolePlayMode ? (
        <RolePlayPrompts roleOnClick={roleOnClick} />
      ) : (
        <SamplePrompts promptOnClick={promptOnClick} />
      )}
      <button
        className="border border-neutral-600 hover:bg-gray-200 text-gray-800 py-2 px-4 rounded-md text-sm mb-3 dark:text-gray-100 dark:hover:bg-transparent"
        onClick={switchButtonOnClick}
      >
        {rolePlayMode
          ? t('Switch to Sample Prompts')
          : t('Switch to Role Play')}
      </button>
      <FootNoteMessage />
    </div>
  );
};
