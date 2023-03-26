import { KeyValuePair } from '@/types/data';
import { Folder } from '@/types/folder';
import { Prompt } from '@/types/prompt';
import {
  IconArrowBarRight,
  IconFolderPlus,
  IconPlus,
} from '@tabler/icons-react';
import { FC, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search } from '../Sidebar/Search';
import { PromptbarSettings } from './PromptbarSettings';
import { Prompts } from './Prompts';

interface Props {
  prompts: Prompt[];
  folders: Folder[];
  onToggleSidebar: () => void;
  onCreatePrompt: () => void;
  onUpdatePrompt: (prompt: Prompt, data: KeyValuePair) => void;
  onDeletePrompt: (prompt: Prompt) => void;
  onCreatePromptFolder: (name: string) => void;
}

export const Promptbar: FC<Props> = ({
  folders,
  prompts,
  onCreatePrompt,
  onCreatePromptFolder,
  onUpdatePrompt,
  onDeletePrompt,
  onToggleSidebar,
}) => {
  const { t } = useTranslation('promptbar');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filteredPrompts, setFilteredPrompts] = useState<Prompt[]>(prompts);

  const handleUpdatePrompt = (prompt: Prompt, data: KeyValuePair) => {
    onUpdatePrompt(prompt, data);
    setSearchTerm('');
  };

  const handleDeletePrompt = (prompt: Prompt) => {
    onDeletePrompt(prompt);
    setSearchTerm('');
  };

  const handleDrop = (e: any) => {
    if (e.dataTransfer) {
      const prompt = JSON.parse(e.dataTransfer.getData('prompt'));
      onUpdatePrompt(prompt, { key: 'folderId', value: 0 });

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
    if (searchTerm) {
      setFilteredPrompts(
        prompts.filter((prompt) => {
          const searchable = prompt.name.toLowerCase();
          return searchable.includes(searchTerm.toLowerCase());
        }),
      );
    } else {
      setFilteredPrompts(prompts);
    }
  }, [searchTerm, prompts]);

  console.log('filteredPrompts', filteredPrompts);

  return (
    <div
      className={`fixed top-0 bottom-0 z-50 flex h-full w-[260px] flex-none flex-col space-y-2 bg-[#202123] p-2 transition-all sm:relative sm:top-0`}
    >
      <div className="flex items-center">
        <button
          className="flex w-[190px] flex-shrink-0 cursor-pointer items-center gap-3 rounded-md border border-white/20 p-3 text-sm text-white transition-colors duration-200 hover:bg-gray-500/10"
          onClick={() => {
            onCreatePrompt();
            setSearchTerm('');
          }}
        >
          <IconPlus size={16} />
          {t('New prompt')}
        </button>

        <button
          className="ml-2 flex flex-shrink-0 cursor-pointer items-center gap-3 rounded-md border border-white/20 p-3 text-sm text-white transition-colors duration-200 hover:bg-gray-500/10"
          onClick={() => onCreatePromptFolder(t('New folder'))}
        >
          <IconFolderPlus size={16} />
        </button>

        <IconArrowBarRight
          className="ml-1 hidden cursor-pointer p-1 text-neutral-300 hover:text-neutral-400 sm:flex"
          size={32}
          onClick={onToggleSidebar}
        />
      </div>

      {prompts.length > 1 && (
        <Search searchTerm={searchTerm} onSearch={setSearchTerm} />
      )}

      <div className="flex-grow overflow-auto">
        {folders.length > 0 && (
          <div className="flex border-b border-white/20 pb-2">Folders</div>
        )}

        {prompts.length > 0 ? (
          <div
            className="h-full pt-2"
            onDrop={(e) => handleDrop(e)}
            onDragOver={allowDrop}
            onDragEnter={highlightDrop}
            onDragLeave={removeHighlight}
          >
            <Prompts
              prompts={filteredPrompts.filter(
                (prompt) =>
                  prompt.folderId === 0 || !folders[prompt.folderId - 1],
              )}
            />
          </div>
        ) : (
          <div className="mt-4 text-center text-white">
            <div>{t('No prompts.')}</div>
          </div>
        )}
      </div>

      <PromptbarSettings />
    </div>
  );
};
