import { Plugin, PluginID } from '@/types/plugin';
import { Conversation } from '@/types/chat';
import { OpenAIModels } from '@/types/openai';

export const getEndpoint = (plugin: Plugin | null) => {
  if (!plugin) {
    return 'api/chat';
  }

  if (plugin.id === PluginID.GOOGLE_SEARCH) {
    return 'api/google';
  }

  if (plugin.id === PluginID.LANGCHAIN_CHAT) {
    return 'http://localhost:4000/langchain-chat';
  }

  return 'api/chat';
};

export async function fetchShareableConversation(accessibleId: string): Promise<Conversation | null> {
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
      prompt: "You are ChatGPT, a large language model trained by OpenAI. Follow the user's instructions carefully. Respond using markdown.",
      folderId: null,
    };
  } catch (error) {
    console.error(error);
    return null;
  }
}