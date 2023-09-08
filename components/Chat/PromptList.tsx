import { FC, MutableRefObject } from 'react';

import { Prompt } from '@/types/prompt';

interface Props {
  prompts: Prompt[];
  activePromptIndex: number;
  onSelect: () => void;
  onMouseOver: (index: number) => void;
  promptListRef: MutableRefObject<HTMLUListElement | null>;
}

export const PromptList: FC<Props> = ({
  prompts,
  activePromptIndex,
  onSelect,
  onMouseOver,
  promptListRef,
}) => {
  return (
    <ul
      ref={promptListRef}
      className="z-10 flex justify-center items-center max-h-52 w-full overflow-auto rounded border border-black/10 bg-white shadow-[0_0_10px_rgba(0,0,0,0.10)] dark:border-gray-500 dark:bg-gray-700 dark:text-white dark:shadow-[0_0_15px_rgba(0,0,0,0.10)]"
    >
      {prompts.map((prompt, index) => (
        <li
          key={prompt.id}
          className={`w-full rounded-md m-1 ${
            index === activePromptIndex ? 'bg-black/10 dark:text-black' : ''
          } cursor-pointer px-3 py-2 text-sm text-black dark:text-white`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onSelect();
          }}
          onMouseEnter={() => onMouseOver(index)}
        >
          {prompt.name}
        </li>
      ))}
    </ul>
  );
};
