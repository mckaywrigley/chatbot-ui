import { ChatBody, Conversation } from '@/types/chat';
import { Plugin, PluginKey } from '@/types/plugin';

import { getEndpoint } from './api';

export const sendChatRequest = async (
  conversation: Conversation,
  plugin: Plugin | null,
  apiKey: string,
  pluginKeys: PluginKey[],
) => {
  const chatBody: ChatBody = {
    model: conversation.model,
    messages: conversation.messages,
    key: apiKey,
    prompt: conversation.prompt,
    temperature: conversation.temperature,
  };
  const endpoint = getEndpoint(plugin);
  let body;
  if (!plugin) {
    body = JSON.stringify(chatBody);
  } else {
    body = JSON.stringify({
      ...chatBody,
      googleAPIKey: pluginKeys
        .find((key) => key.pluginId === 'google-search')
        ?.requiredKeys.find((key) => key.key === 'GOOGLE_API_KEY')?.value,
      googleCSEId: pluginKeys
        .find((key) => key.pluginId === 'google-search')
        ?.requiredKeys.find((key) => key.key === 'GOOGLE_CSE_ID')?.value,
    });
  }
  const controller = new AbortController();
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    signal: controller.signal,
    body,
  });

  return { response: response, controller: controller };
};
