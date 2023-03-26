import { OpenAIModel } from './openai';

export interface Prompt {
  id: number;
  name: string;
  prompt: string;
  model: OpenAIModel;
  folderId: number;
}
