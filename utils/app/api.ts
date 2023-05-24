import { DEFAULT_SYSTEM_PROMPT, DEFAULT_TEMPERATURE } from '@/utils/app/const';

import { Conversation } from '@/types/chat';
import { OpenAIModels } from '@/types/openai';
import { Plugin, PluginID } from '@/types/plugin';
import dayjs from 'dayjs';

export const getEndpoint = (plugin: Plugin | null) => {
  if (!plugin) {
    return 'api/chat';
  }

  if (plugin.id === PluginID.LANGCHAIN_CHAT) {
    return 'api/langchain-api';
  }

  if (plugin.id === PluginID.GPT4) {
    return 'api/chat-gpt4';
  }

  if (plugin.id === PluginID.IMAGE_GEN) {
    return 'api/image-gen';
  }

  return 'api/chat';
};

export async function fetchShareableConversation(
  accessibleId: string,
): Promise<Conversation | null> {
  try {
    const response = await fetch('/api/fetchConversation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ accessible_id: accessibleId }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch the conversation');
    }

    const { title, prompts } = await response.json();

    return {
      id: accessibleId,
      name: title + ' (Shared)',
      messages: JSON.parse(prompts),
      model: OpenAIModels['gpt-3.5-turbo'],
      prompt: DEFAULT_SYSTEM_PROMPT,
      folderId: null,
      temperature: DEFAULT_TEMPERATURE,
      lastUpdateAtUTC: dayjs().valueOf(),
    };
  } catch (error) {
    console.error(error);
    throw new Error('Failed to fetch the conversation');
  }
}
