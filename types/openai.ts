import { OPENAI_API_TYPE } from '../utils/app/const';

export interface OpenAIModel {
  id: string;
  name: string;
  maxLength: number; // maximum length of a message
  tokenLimit: number;
}

export enum OpenAIModelID {
  GPT_3_5 = 'gpt-3.5-turbo',
  GPT_3_5_AZ = 'gpt-35-turbo',
  GPT_4 = 'gpt-4',
  GPT_4_32K = 'gpt-4-32k',
}

export enum WindowAIModelID {
  GPT3 = "openai/gpt3.5",
  GPT4 = "openai/gpt4",
  GPTNeo = "together/gpt-neoxt-20B",
  Cohere = "cohere/xlarge",
  CustomOrLocal = "customOrLocal",
}

// in case the `DEFAULT_MODEL` environment variable is not set or set to an unsupported model
export const fallbackModelID = OpenAIModelID.GPT_3_5;

export const OpenAIModels: Record<OpenAIModelID, OpenAIModel> = {
  [OpenAIModelID.GPT_3_5]: {
    id: OpenAIModelID.GPT_3_5,
    name: 'GPT-3.5',
    maxLength: 12000,
    tokenLimit: 4000,
  },
  [OpenAIModelID.GPT_3_5_AZ]: {
    id: OpenAIModelID.GPT_3_5_AZ,
    name: 'GPT-3.5',
    maxLength: 12000,
    tokenLimit: 4000,
  },
  [OpenAIModelID.GPT_4]: {
    id: OpenAIModelID.GPT_4,
    name: 'GPT-4',
    maxLength: 24000,
    tokenLimit: 8000,
  },
  [OpenAIModelID.GPT_4_32K]: {
    id: OpenAIModelID.GPT_4_32K,
    name: 'GPT-4-32K',
    maxLength: 96000,
    tokenLimit: 32000,
  },
};

export const WindowAIModels: Record<WindowAIModelID, OpenAIModel> = {
  [WindowAIModelID.GPT3]: {
    id: WindowAIModelID.GPT3,
    name: 'GPT-3.5',
    maxLength: 12000,
    tokenLimit: 4000,
  },
  [WindowAIModelID.GPT4]: { 
    id: WindowAIModelID.GPT4,
    name: 'GPT-4',
    maxLength: 24000,
    tokenLimit: 8000,
  },
  [WindowAIModelID.GPTNeo]: {
    id: WindowAIModelID.GPTNeo,
    name: 'GPT-Neo',
    maxLength: 24000,
    tokenLimit: 8000,
  },
  [WindowAIModelID.Cohere]: {
    id: WindowAIModelID.Cohere,
    name: 'Cohere',
    maxLength: 24000,
    tokenLimit: 8000,
  },
  [WindowAIModelID.CustomOrLocal]: {
    id: WindowAIModelID.CustomOrLocal,
    name: 'Custom / Local',
    maxLength: 24000,
    tokenLimit: 8000,
  },
};