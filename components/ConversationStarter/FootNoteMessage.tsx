import { FC, useEffect, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { IconBolt, IconX } from '@tabler/icons-react';

export const FootNoteMessage: FC = () => {
  const { t } = useTranslation('chat');
  const [showSurveyMessage, setShowSurveyMessage] = useState(true);

  useEffect(() => {
    const surveyMessageDismissed = localStorage.getItem(
      'surveyMessageDismissed',
    );
    if (surveyMessageDismissed) {
      setShowSurveyMessage(false);
    }
  }, []);

  const dismissSurveyMessage = () => {
    localStorage.setItem('surveyMessageDismissed', 'true');
    setShowSurveyMessage(false);
  };

  const surveyOnClick = () => {
    window.open(
      'https://docs.google.com/forms/d/e/1FAIpQLSdBjT3Ft9-N-zBfnbIbWiaAfAl8cEnzeEHBDc2ku4Vm4oZVNA/viewform',
      '_blank',
    );
  };

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

      {/* Promote survey */}
      {showSurveyMessage && (
        <div className="mt-4 flex items-center justify-center rounded-md border border-neutral-200 p-2 dark:border-neutral-600">
          <span
            className="mr-2 rounded bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 cursor-pointer"
            onClick={surveyOnClick}
          >
            New
          </span>
          <span
            className="flex flex-row flex-wrap items-center justify-center leading-4 cursor-pointer"
            onClick={surveyOnClick}
          >
            {t('Help us shape the future of Chat Everywhere by taking our')}
            <a onClick={surveyOnClick} className="px-1 underline">
              {t('quick survey')}{' '}
            </a>
            {t('- your voice matters!')}
          </span>
          <IconX
            size={17}
            stroke={2}
            className="ml-2 cursor-pointer"
            onClick={dismissSurveyMessage}
          />
        </div>
      )}

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
