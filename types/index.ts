export interface OpenAIModel {
  id: string;
  name: string;
}

export enum OpenAIModelID {
  GPT_3_5 = "gpt-3.5-turbo",
  GPT_4 = "gpt-4"
}

export const OpenAIModels: Record<OpenAIModelID, OpenAIModel> = {
  [OpenAIModelID.GPT_3_5]: {
    id: OpenAIModelID.GPT_3_5,
    name: "Default (GPT-3.5)"
  },
  [OpenAIModelID.GPT_4]: {
    id: OpenAIModelID.GPT_4,
    name: "GPT-4"
  }
};

export interface Message {
  role: Role;
  content: string;
}

export type Role = "assistant" | "user";

export interface Conversation {
  id: number;
  name: string;
  messages: Message[];
  model: OpenAIModel;
}

// keep track of local storage schema
export interface LocalStorage {
  apiKey: string;
  conversationHistory: Conversation[];
  selectedConversation: Conversation;
  theme: "light" | "dark";
}
