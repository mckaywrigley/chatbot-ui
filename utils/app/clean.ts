import { Conversation } from '@/types/chat';
import { OpenAIModelID, OpenAIModels } from '@/types/openai';

import { DEFAULT_TEMPERATURE } from './const';
import { defaultPrompt } from './prompts';
import { PrivateAIModelID, PrivateAIModels } from '@/types/privateIA';

export const cleanSelectedConversation = (conversation: Conversation) => {
  // added model for each conversation (3/20/23)
  // added system prompt for each conversation (3/21/23)
  // added folders (3/23/23)
  // added prompts (3/26/23)
  // added messages (4/16/23)

  let updatedConversation = conversation;

  // check for model on each conversation
  if (!updatedConversation.model) {
    updatedConversation = {
      ...updatedConversation,
      model: updatedConversation.model || PrivateAIModels[PrivateAIModelID.PRIVATE_IA],
    };
  }

  // check for system prompt on each conversation
  if (!updatedConversation.prompt) {
    updatedConversation = {
      ...updatedConversation,
      prompt: updatedConversation.prompt || defaultPrompt(updatedConversation.model.id),
    };
  }

  if (!updatedConversation.temperature) {
    updatedConversation = {
      ...updatedConversation,
      temperature: updatedConversation.temperature || DEFAULT_TEMPERATURE,
    };
  }

  if (!updatedConversation.folderId) {
    updatedConversation = {
      ...updatedConversation,
      folderId: updatedConversation.folderId || null,
    };
  }

  if (!updatedConversation.messages) {
    updatedConversation = {
      ...updatedConversation,
      messages: updatedConversation.messages || [],
    };
  }

  return updatedConversation;
};

export const cleanConversationHistory = (history: any[]): Conversation[] => {
  // added model for each conversation (3/20/23)
  // added system prompt for each conversation (3/21/23)
  // added folders (3/23/23)
  // added prompts (3/26/23)
  // added messages (4/16/23)

  if (!Array.isArray(history)) {
    console.warn('history is not an array. Returning an empty array.');
    return [];
  }

  return history.reduce((acc: any[], conversation) => {
    try {
      if (!conversation.model) {
        conversation.model = PrivateAIModels[PrivateAIModelID.PRIVATE_IA];
      }

      if (!conversation.prompt) {
        conversation.prompt = defaultPrompt(conversation.model.id);
      }

      if (!conversation.temperature) {
        conversation.temperature = DEFAULT_TEMPERATURE;
      }

      if (!conversation.folderId) {
        conversation.folderId = null;
      }

      if (!conversation.messages) {
        conversation.messages = [];
      }

      acc.push(conversation);
      return acc;
    } catch (error) {
      console.warn(
        `error while cleaning conversations' history. Removing culprit`,
        error,
      );
    }
    return acc;
  }, []);
};
