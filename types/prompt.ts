import { OpenAIModel } from './openai';
import { PrivateAIModel } from './privateIA';

export interface Prompt {
  id: string;
  name: string;
  description: string;
  content: string;
  model: OpenAIModel | PrivateAIModel;
  folderId: string | null;
}
