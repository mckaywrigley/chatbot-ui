import { IconBolt, IconBrain, IconNumber4, IconPaint } from '@tabler/icons-react';

import { PluginID } from '@/types/plugin';

export const getPluginIcon = (
  pluginId: string | undefined | null,
  iconSize?: number,
) => {
  const size = iconSize || 20;
  if (!pluginId) {
    return <IconBolt size={20} />;
  }

  switch (pluginId) {
    case PluginID.LANGCHAIN_CHAT:
      return <IconBrain size={size} />;
    case PluginID.GPT4:
      return <IconNumber4 size={size} />;
    case PluginID.IMAGE_GEN:
      return <IconPaint size={size} />;
    default:
      return <IconBolt size={size} />;
  }
};

export const markSurveyIsFilledInLocalStorage = () =>
  localStorage.setItem('surveyIsFilled', 'true');

export const getIsSurveyFilledFromLocalStorage = () =>
  localStorage.getItem('surveyIsFilled') === 'true';
