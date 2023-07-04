import { OpenAIModel } from './openai';

export interface Prompt {
  id: string;
  name: string;
  description: string;
  content: string;
  model: OpenAIModel;
  folderId: string | null;
}

export interface PromptRequest {
  id: string
  prompt: string
  isPublic?: boolean
}