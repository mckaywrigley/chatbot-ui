import { OpenAIModel } from '@/types/openai';
import { Prompt } from '@/types/prompt';
import { v4 as uuidv4 } from 'uuid';

export const createPrompt = (
  promptName: string,
  model: OpenAIModel,
): Prompt => {
  return {
    id: uuidv4(),
    name: promptName,
    description: '',
    content: '',
    model,
    folderId: null,
  };
};
