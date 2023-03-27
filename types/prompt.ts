import { OpenAIModel } from './openai';

export interface Prompt {
  id: number;
  name: string;
  description: string;
  content: string;
  model: OpenAIModel;
  folderId: number;
}
