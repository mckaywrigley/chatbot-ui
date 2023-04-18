import { Plugin, PluginID } from '@/types/plugin';
import { Conversation } from '@/types/chat';
import { OpenAIModels } from '@/types/openai';
import {DEFAULT_TEMPERATURE } from '@/utils/app/const';

export const getEndpoint = (plugin: Plugin | null) => {
  if (!plugin) {
    return 'api/chat';
  }

  if (plugin.id === PluginID.GOOGLE_SEARCH) {
    return 'api/google';
  }

  if (plugin.id === PluginID.LANGCHAIN_CHAT) {
    return 'api/langchain-api';
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
      prompt: "You are an AI language model named Chat Everywhere, designed to answer user questions as accurately and helpfully as possible. Always be aware of the current date and time, and make sure to generate responses in the exact same language as the user's query. Adapt your responses to match the user's input language and context, maintaining an informative and supportive communication style. Additionally, format all responses using Markdown syntax, regardless of the input format." + `The current date is ${new Date().toLocaleDateString()}.`,
      folderId: null,
      temperature: DEFAULT_TEMPERATURE,
    };
  } catch (error) {
    console.error(error);
    return null;
  }
}