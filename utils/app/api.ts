import { Plugin, PluginID } from '@/types/plugin';
import { BASEPATH } from '@/utils/app/const';

export const getEndpoint = (plugin: Plugin | null) => {
  if (!plugin) {
    return `${BASEPATH}/api/chat`;
  }

  if (plugin.id === PluginID.GOOGLE_SEARCH) {
    return `${BASEPATH}/api/google`;
  }

  return `${BASEPATH}/api/chat`;
};
