import React, { useContext } from 'react';

import { useTranslation } from 'next-i18next';

import { PluginID } from '@/types/plugin';

import HomeContext from '@/pages/api/home/home.context';

type Props = {
  pluginId: PluginID | null;
};

export const CreditCounter: React.FC<Props> = ({ pluginId }) => {
  const { t } = useTranslation('chat');

  const {
    state: { creditUsage },
    dispatch: homeDispatch,
  } = useContext(HomeContext);

  if (
    creditUsage === null ||
    (pluginId !== PluginID.GPT4 && pluginId !== PluginID.IMAGE_GEN)
  )
    return <></>;

  const remainingCredits = pluginId && creditUsage[pluginId].remainingCredits;

  return (
    <div
      className="flex items-center justify-center cursor-pointer text-gray-500 hover:text-gray-300 text-xs ml-3"
      onClick={() => homeDispatch({ field: 'showUsageModel', value: true })}
    >
      {t('Remaining Credits')}: {remainingCredits}
    </div>
  );
};
