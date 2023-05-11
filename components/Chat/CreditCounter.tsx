import React, { useContext } from 'react';

import { useTranslation } from 'next-i18next';

import { PluginID } from '@/types/plugin';

import HomeContext from '@/pages/api/home/home.context';

type Props = {
  pluginId: PluginID.GPT4 | null;
};

export const CreditCounter: React.FC<Props> = ({ pluginId }) => {
  const { t } = useTranslation('chat');
  const {
    state: { pluginUsage },
    dispatch: homeDispatch,
  } = useContext(HomeContext);

  if (!pluginUsage) return <></>;

  const remainingCredits = pluginId && pluginUsage[pluginId].remainingCredits;

  if (!remainingCredits) return <></>;

  return (
    <div className="flex items-center justify-center">
      {t('Remaining Credits')}: {remainingCredits}
    </div>
  );
};
