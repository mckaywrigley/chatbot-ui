import { Prompt } from '@/types/prompt';
import {
  IconBulbFilled,
  IconCheck,
  IconPencil,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import { DragEvent, FC, useEffect, useState } from 'react';
import { PromptModal } from './PromptModal';

interface Props {
  selectedPrompt: Prompt | undefined;
  prompt: Prompt;
  onSelectPrompt: (prompt: Prompt | undefined) => void;
  onUpdatePrompt: (prompt: Prompt) => void;
  onDeletePrompt: (prompt: Prompt) => void;
}

export const PromptComponent: FC<Props> = ({
  selectedPrompt,
  prompt,
  onSelectPrompt,
  onUpdatePrompt,
  onDeletePrompt,
}) => {
  const [showModal, setShowModal] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  const handleDragStart = (e: DragEvent<HTMLButtonElement>, prompt: Prompt) => {
    if (e.dataTransfer) {
      e.dataTransfer.setData('prompt', JSON.stringify(prompt));
    }
  };

  useEffect(() => {
    if (isRenaming) {
      setIsDeleting(false);
    } else if (isDeleting) {
      setIsRenaming(false);
    }
  }, [isRenaming, isDeleting]);

  return (
    <>
      <button
        className="text-sidebar flex w-full cursor-pointer items-center gap-3 rounded-lg p-3 text-[12px] transition-colors duration-200 hover:bg-[#343541]/90"
        draggable="true"
        onClick={() => onSelectPrompt(prompt)}
        onDragStart={(e) => handleDragStart(e, prompt)}
        onMouseEnter={() => onSelectPrompt(prompt)}
        onMouseLeave={() => {
          onSelectPrompt(undefined);
          setIsDeleting(false);
          setIsRenaming(false);
          setRenameValue('');
        }}
      >
        <IconBulbFilled size={16} />

        {isRenaming && selectedPrompt?.id === prompt.id ? (
          <input
            className="flex-1 overflow-hidden overflow-ellipsis border-b border-neutral-400 bg-transparent pr-1 text-left text-white outline-none focus:border-neutral-100"
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            autoFocus
          />
        ) : (
          <div className="flex-1 overflow-hidden overflow-ellipsis whitespace-nowrap pr-1 text-left">
            {prompt.name}
          </div>
        )}

        {(isDeleting || isRenaming) && selectedPrompt?.id === prompt.id && (
          <div className="-ml-2 flex gap-1">
            <IconCheck
              className="min-w-[20px] text-neutral-400 hover:text-neutral-100"
              size={16}
              onClick={(e) => {
                e.stopPropagation();

                if (isDeleting) {
                  onDeletePrompt(prompt);
                }

                setIsDeleting(false);
              }}
            />

            <IconX
              className="min-w-[20px] text-neutral-400 hover:text-neutral-100"
              size={16}
              onClick={(e) => {
                e.stopPropagation();
                setIsDeleting(false);
              }}
            />
          </div>
        )}

        {selectedPrompt?.id === prompt.id && !isDeleting && !isRenaming && (
          <div className="-ml-2 flex gap-1">
            <IconPencil
              className="min-w-[20px] text-neutral-400 hover:text-neutral-100"
              size={18}
              onClick={(e) => {
                e.stopPropagation();
                setShowModal(true);
              }}
            />

            <IconTrash
              className=" min-w-[20px] text-neutral-400 hover:text-neutral-100"
              size={18}
              onClick={(e) => {
                e.stopPropagation();
                setIsDeleting(true);
              }}
            />
          </div>
        )}
      </button>

      {showModal && (
        <PromptModal
          prompt={prompt}
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onUpdatePrompt={onUpdatePrompt}
        />
      )}
    </>
  );
};
