import { Prompt } from '@chatbot-ui/core/types/prompt';

export interface PromptbarInitialState {
  searchTerm: string;
  filteredPrompts: Prompt[];
}

export const initialState: PromptbarInitialState = {
  searchTerm: '',
  filteredPrompts: [],
};
