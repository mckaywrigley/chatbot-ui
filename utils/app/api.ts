import { OpenAIModelID } from '@/types/openai';
import { Plugin, PluginID } from '@/types/plugin';
import { PrivateAIModelID } from '@/types/privateIA';

export const getEndpoint = (plugin: Plugin | null, modelId: string) => {
  if (Object.keys(PrivateAIModelID).find(key => PrivateAIModelID[key as keyof typeof PrivateAIModelID] === modelId)) {
    return '/api/chatPrivateIA';
  }

  if (!plugin) {
    return 'api/chat';
  }

  if (plugin?.id === PluginID.GOOGLE_SEARCH) {
    return 'api/google';
  }

  return 'api/chat';
};
