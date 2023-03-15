export enum OpenAIModel {
  GPT_3_5 = "gpt-3.5-turbo",
  GPT_3_5_LEGACY = "gpt-3.5-turbo-0301"
  // GPT_4 = "gpt-4"
}

export const OpenAIModelNames: Record<OpenAIModel, string> = {
  [OpenAIModel.GPT_3_5]: "Default (GPT-3.5)",
  [OpenAIModel.GPT_3_5_LEGACY]: "Legacy (GPT-3.5)"
  // [OpenAIModel.GPT_4]: "GPT-4"
};

export interface Message {
  role: Role;
  content: string;
}

export type Role = "assistant" | "user";
