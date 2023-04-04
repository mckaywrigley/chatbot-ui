import { OpenAIModels, OpenAIModelID } from '@/types/openai';
import { render, screen } from '@testing-library/react';
import { it, expect, describe } from 'vitest';
import { Promptbar } from '@/components/Promptbar/Promptbar';
import { createPrompt } from '@/utils/app/prompt';

describe('Export Format Functions', () => {
  // create a mock Prompt model
  it('test', () => {
    let mockPrompt = createPrompt('hello', OpenAIModels[OpenAIModelID.GPT_3_5]);
    console.log(Promptbar);
    render(
      <Promptbar
        prompts={[mockPrompt]}
        folders={[]}
        onCreateFolder={() => {}}
        onDeleteFolder={() => {}}
        onUpdateFolder={() => {}}
        onCreatePrompt={() => {}}
        onUpdatePrompt={() => {}}
        onDeletePrompt={() => {}}
      />,
    );
    expect(screen.getByText('hello'), 'pass').toBeDefined();
  });
});
