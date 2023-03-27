import { PromptComponent } from '@/components/Promptbar/Prompt';
import { Folder } from '@/types/folder';
import { Prompt } from '@/types/prompt';
import {
  IconCaretDown,
  IconCaretRight,
  IconCheck,
  IconPencil,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import { FC, KeyboardEvent, useEffect, useState } from 'react';

interface Props {
  searchTerm: string;
  prompts: Prompt[];
  currentFolder: Folder;
  onDeleteFolder: (folder: string) => void;
  onUpdateFolder: (folder: string, name: string) => void;
  // prompt props
  onDeletePrompt: (prompt: Prompt) => void;
  onUpdatePrompt: (prompt: Prompt) => void;
}

export const PromptFolder: FC<Props> = ({
  searchTerm,
  prompts,
  currentFolder,
  onDeleteFolder,
  onUpdateFolder,
  // prompt props
  onDeletePrompt,
  onUpdatePrompt,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const handleEnterDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRename();
    }
  };

  const handleRename = () => {
    onUpdateFolder(currentFolder.id, renameValue);
    setRenameValue('');
    setIsRenaming(false);
  };

  const handleDrop = (e: any, folder: Folder) => {
    if (e.dataTransfer) {
      setIsOpen(true);

      const prompt = JSON.parse(e.dataTransfer.getData('prompt'));

      const updatedPrompt = {
        ...prompt,
        folderId: folder.id,
      };

      onUpdatePrompt(updatedPrompt);

      e.target.style.background = 'none';
    }
  };

  const allowDrop = (e: any) => {
    e.preventDefault();
  };

  const highlightDrop = (e: any) => {
    e.target.style.background = '#343541';
  };

  const removeHighlight = (e: any) => {
    e.target.style.background = 'none';
  };

  useEffect(() => {
    if (isRenaming) {
      setIsDeleting(false);
    } else if (isDeleting) {
      setIsRenaming(false);
    }
  }, [isRenaming, isDeleting]);

  useEffect(() => {
    if (searchTerm) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [searchTerm]);

  return (
    <div>
      <div
        className={`mb-1 flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-[14px] leading-normal transition-colors duration-200 hover:bg-[#343541]/90`}
        onClick={() => setIsOpen(!isOpen)}
        onDrop={(e) => handleDrop(e, currentFolder)}
        onDragOver={allowDrop}
        onDragEnter={highlightDrop}
        onDragLeave={removeHighlight}
      >
        {isOpen ? <IconCaretDown size={16} /> : <IconCaretRight size={16} />}

        {isRenaming ? (
          <input
            className="flex-1 overflow-hidden overflow-ellipsis border-b border-neutral-400 bg-transparent pr-1 text-left text-white outline-none focus:border-neutral-100"
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={handleEnterDown}
            autoFocus
          />
        ) : (
          <div className="flex-1 overflow-hidden overflow-ellipsis whitespace-nowrap pr-1 text-left">
            {currentFolder.name}
          </div>
        )}

        {(isDeleting || isRenaming) && (
          <div className="-ml-2 flex gap-1">
            <IconCheck
              className="min-w-[20px] text-neutral-400 hover:text-neutral-100"
              size={16}
              onClick={(e) => {
                e.stopPropagation();

                if (isDeleting) {
                  onDeleteFolder(currentFolder.id);
                } else if (isRenaming) {
                  handleRename();
                }

                setIsDeleting(false);
                setIsRenaming(false);
              }}
            />

            <IconX
              className="min-w-[20px] text-neutral-400 hover:text-neutral-100"
              size={16}
              onClick={(e) => {
                e.stopPropagation();
                setIsDeleting(false);
                setIsRenaming(false);
              }}
            />
          </div>
        )}

        {!isDeleting && !isRenaming && (
          <div className="ml-2 flex gap-1">
            <IconPencil
              className="min-w-[20px] text-neutral-400 hover:text-neutral-100"
              size={18}
              onClick={(e) => {
                e.stopPropagation();
                setIsRenaming(true);
                setRenameValue(currentFolder.name);
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
      </div>

      {isOpen
        ? prompts.map((prompt, index) => {
            if (prompt.folderId === currentFolder.id) {
              return (
                <div key={index} className="ml-5 gap-2 border-l pl-2 pt-2">
                  <PromptComponent
                    prompt={prompt}
                    onDeletePrompt={onDeletePrompt}
                    onUpdatePrompt={onUpdatePrompt}
                  />
                </div>
              );
            }
          })
        : null}
    </div>
  );
};
