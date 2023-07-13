import { Plugin, PluginID } from '@/types/plugin';
import { getEnvValue } from '@/utils/app/config';

export const getEndpoint = (plugin: Plugin | null) => {
  if (!plugin) {
    return `${getEnvValue('BASEPATH')}/api/chat`;
  }

  if (plugin.id === PluginID.GOOGLE_SEARCH) {
    return `${getEnvValue('BASEPATH')}/api/google`;
  }

  return `${getEnvValue('BASEPATH')}/api/chat`;
};
