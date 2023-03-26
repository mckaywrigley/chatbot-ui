import { Prompt } from '@/types/prompt';
import { FC, useState } from 'react';
import { PromptComponent } from './Prompt';

interface Props {
  prompts: Prompt[];
}

export const Prompts: FC<Props> = ({ prompts }) => {
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt>();

  return (
    <div className="flex w-full flex-col gap-1">
      {prompts
        .slice()
        .reverse()
        .map((prompt, index) => (
          <PromptComponent
            key={index}
            selectedPrompt={selectedPrompt}
            prompt={prompt}
            onSelectPrompt={setSelectedPrompt}
            onUpdatePrompt={() => {}}
            onDeletePrompt={() => {}}
          />
        ))}
    </div>
  );
};
