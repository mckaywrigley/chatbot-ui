import { OPENAI_API_TYPE } from '../utils/app/const';
import { ModelID } from 'window.ai';

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
export const WindowAIModels: Record<ModelID, OpenAIModel> = {
  [ModelID.GPT_3]: {
    id: ModelID.GPT_3,
    name: 'GPT-3.5',
    maxLength: 12000,
    tokenLimit: 4000,
  },
  [ModelID.GPT_4]: { 
    id: ModelID.GPT_4,
    name: 'GPT-4',
    maxLength: 24000,
    tokenLimit: 8000,
  },
  [ModelID.Claude_Instant_V1]: {
    id: ModelID.Claude_Instant_V1,
    name: 'Claude Instant V1',
    maxLength: 12000,
    tokenLimit: 4000,
  },
  [ModelID.Claude_Instant_V1_100k]: {
    id: ModelID.Claude_Instant_V1_100k,
    name: 'Claude Instant V1 100k',
    maxLength: 100000,
    tokenLimit: 100000,
  },
  [ModelID.Claude_V1]: {
    id: ModelID.Claude_V1,
    name: 'Claude V1',
    maxLength: 12000,
    tokenLimit: 4000,
  },
  [ModelID.Claude_V1_100k]: {
    id: ModelID.Claude_V1_100k,
    name: 'Claude V1 100k',
    maxLength: 100000,
    tokenLimit: 100000,
  },
  [ModelID.Together]: {
    id: ModelID.Together,
    name: 'Together',
    maxLength: 12000,
    tokenLimit: 4000,
  },
  [ModelID.Cohere]: {
    id: ModelID.Cohere,
    name: 'Cohere',
    maxLength: 12000,
    tokenLimit: 4000,
  },
};