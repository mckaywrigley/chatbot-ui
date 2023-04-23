import { Conversation } from '@/types/chat';
import { OpenAIModelID, OpenAIModels } from '@/types/openai';
import { v4 as uuidv4 } from 'uuid';
import { getCurrentUnixTime } from './chatRoomUtils';
import { DEFAULT_SYSTEM_PROMPT, DEFAULT_TEMPERATURE } from '@/utils/app/const';

export const updateConversation = (
  updatedConversation: Conversation,
  allConversations: Conversation[],
) => {
  const updatedConversations = allConversations.map((c) => {
    if (c.id === updatedConversation.id) {
      return updatedConversation;
    }

    return c;
  });

  saveConversation(updatedConversation);
  saveConversations(updatedConversations);

  return {
    single: updatedConversation,
    all: updatedConversations,
  };
};

export const saveConversation = (conversation: Conversation) => {
  localStorage.setItem('selectedConversation', JSON.stringify(conversation));
};

export const saveConversations = (conversations: Conversation[]) => {
  localStorage.setItem('conversationHistory', JSON.stringify(conversations));
};

export const createNewConversation = (name: string, defaultModelId: OpenAIModelID, lastConversation?: Conversation) => {
  let id = uuidv4();
  const currentTime = getCurrentUnixTime();
  let conversation: Conversation = {
    id,
    name,
    model: lastConversation?.model || {
      id: OpenAIModels[defaultModelId].id,
      name: OpenAIModels[defaultModelId].name,
      maxLength: OpenAIModels[defaultModelId].maxLength,
      tokenLimit: OpenAIModels[defaultModelId].tokenLimit,
    },
    prompt: DEFAULT_SYSTEM_PROMPT,
    folderId: null,
    mapping: {
      [id]: {
        id,
        message: {
          id,
          role: 'system',
          content: '',
          create_time: currentTime,
        },
        children: [],
      },
    },
    current_node: id,
    create_time: currentTime,
    update_time: currentTime,
    temperature: lastConversation?.temperature ?? DEFAULT_TEMPERATURE,
  };
  return conversation;
};