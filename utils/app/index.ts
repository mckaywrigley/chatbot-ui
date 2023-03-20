import { Conversation, OpenAIModelID, OpenAIModels } from "@/types";

export const cleanConversationHistory = (history: Conversation[]) => {
  // added model for each conversation (3/20/23)

  if (history.length === 0) {
    return history;
  } else {
    return history.map((conversation) => {
      if (conversation.model) {
        return conversation;
      } else {
        return {
          ...conversation,
          model: OpenAIModels[OpenAIModelID.GPT_3_5]
        };
      }
    });
  }
};

export const cleanSelectedConversation = (conversation: Conversation) => {
  // added model for each conversation (3/20/23)

  if (conversation.model) {
    return conversation;
  } else {
    return {
      ...conversation,
      model: OpenAIModels[OpenAIModelID.GPT_3_5]
    };
  }
};
