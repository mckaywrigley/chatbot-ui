import { useMemo } from 'react';

import { useTranslation } from 'next-i18next';

import { ErrorMessage } from '@/types/error';
import { useAppInsightsContext } from "@microsoft/applicationinsights-react-js";



const useErrorService = () => {
  const { t } = useTranslation('chat');
  const appInsights = useAppInsightsContext();

  return {
    getModelsError: useMemo(
      () => (error: any) => {
        if (error) {
          appInsights.trackEvent({
            name: 'Models Error',
            properties: {
              code: error.status || 'unknown',
              message: error.statusText || '',
            },
          });
        }
        return !error
          ? null
          : ({
            title: t('Error fetching models.'),
            code: error.status || 'unknown',
            messageLines: error.statusText
              ? [error.statusText]
              : [
                t(
                  'Please refresh your browser window. This app has lost its connection to the AI service.',
                ),
                t(
                  'If you are experiencing issues, please email us at datascience@auroracoop.com',
                ),
              ],
          } as ErrorMessage);
      },
      [t],
    ),
  };
};

export default useErrorService;
