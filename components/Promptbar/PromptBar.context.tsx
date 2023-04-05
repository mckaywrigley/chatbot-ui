import { createContext, Dispatch } from 'react';
import { ActionType } from '@/hooks/useCreateReducer';
import { PromptbarInitialState } from './Promptbar.state';

import { Prompt } from '@/types/prompt';

export interface PromptbarContextProps {
  state: PromptbarInitialState;
  dispatch: Dispatch<ActionType<PromptbarInitialState>>;
  handleCreatePrompt: () => void;
  handleDeletePrompt: (prompt: Prompt) => void;
  handleUpdatePrompt: (prompt: Prompt) => void;
}

const HomeContext = createContext<PromptbarContextProps>(undefined!);

export default HomeContext;
