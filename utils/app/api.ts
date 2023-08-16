import { Plugin, PluginID } from '@/types/plugin';

export const getEndpoint = (plugin: Plugin | null) => {
  const chatEndpoint = 'https://northstar-staging-fn-fa-tasks.azurewebsites.net/api/hate-audit-chat';
  if (!plugin) {
    return chatEndpoint;
  }

  if (plugin.id === PluginID.GOOGLE_SEARCH) {
    return 'api/google';
  }

  return chatEndpoint;
};
