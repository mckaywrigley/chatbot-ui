import { Conversation, OpenAIModelID, OpenAIModels } from "@/types";
import { DEFAULT_SYSTEM_PROMPT } from "./const";

export const cleanSelectedConversation = (conversation: Conversation) => {
  // added model for each conversation (3/20/23)
  // added system prompt for each conversation (3/21/23)

  let updatedConversation = conversation;

  // check for model on each conversation
  if (!updatedConversation.model) {
    updatedConversation = {
      ...updatedConversation,
      model: OpenAIModels[OpenAIModelID.GPT_3_5]
    };
  }

  // check for system prompt on each conversation
  if (!updatedConversation.prompt) {
    updatedConversation = {
      ...updatedConversation,
      prompt: DEFAULT_SYSTEM_PROMPT
    };
  }

  return updatedConversation;
};

export const cleanConversationHistory = (history: Conversation[]) => {
  // added model for each conversation (3/20/23)
  // added system prompt for each conversation (3/21/23)

  let updatedHistory = [...history];

  // check for model on each conversation
  if (!updatedHistory.every((conversation) => conversation.model)) {
    updatedHistory = updatedHistory.map((conversation) => ({
      ...conversation,
      model: OpenAIModels[OpenAIModelID.GPT_3_5]
    }));
  }

  // check for system prompt on each conversation
  if (!updatedHistory.every((conversation) => conversation.prompt)) {
    updatedHistory = updatedHistory.map((conversation) => ({
      ...conversation,
      systemPrompt: DEFAULT_SYSTEM_PROMPT
    }));
  }

  return updatedHistory;
};
