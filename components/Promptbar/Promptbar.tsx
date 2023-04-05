import { useEffect, useState, useContext } from 'react';

import { Folder } from '@/types/folder';
import { Prompt } from '@/types/prompt';
import { IconFolderPlus, IconMistOff, IconPlus } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { PromptFolders } from '../Folders/Prompt/PromptFolders';
import { Search } from '../Sidebar/Search';
import { PromptbarSettings } from './PromptbarSettings';
import { Prompts } from './Prompts';

import HomeContext from '@/pages/api/home/home.context';

interface Props {
  prompts: Prompt[];
  folders: Folder[];

  onCreatePrompt: () => void;
  onUpdatePrompt: (prompt: Prompt) => void;
  onDeletePrompt: (prompt: Prompt) => void;
}

export const Promptbar = () => {
  const { t } = useTranslation('promptbar');

  const {
    state: { prompts, folders },
    handleCreateFolder,
    handleDeleteFolder,
    handleUpdateFolder,
    handleCreatePrompt,
    handleDeletePrompt,
    handleUpdatePrompt,
  } = useContext(HomeContext);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filteredPrompts, setFilteredPrompts] = useState<Prompt[]>(prompts);

  const handleUpdate = (prompt: Prompt) => {
    handleUpdatePrompt(prompt);
    setSearchTerm('');
  };

  const handleDelete = (prompt: Prompt) => {
    handleDeletePrompt(prompt);
    setSearchTerm('');
  };

  const handleDrop = (e: any) => {
    if (e.dataTransfer) {
      const prompt = JSON.parse(e.dataTransfer.getData('prompt'));

      const updatedPrompt = {
        ...prompt,
        folderId: e.target.dataset.folderId,
      };

      handleUpdatePrompt(updatedPrompt);

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
          const searchable =
            prompt.name.toLowerCase() +
            ' ' +
            prompt.description.toLowerCase() +
            ' ' +
            prompt.content.toLowerCase();
          return searchable.includes(searchTerm.toLowerCase());
        }),
      );
    } else {
      setFilteredPrompts(prompts);
    }
  }, [searchTerm, prompts]);

  return (
    <div
      className={`fixed top-0 right-0 z-50 flex h-full w-[260px] flex-none flex-col space-y-2 bg-[#202123] p-2 text-[14px] transition-all sm:relative sm:top-0`}
    >
      <div className="flex items-center">
        <button
          className="text-sidebar flex w-[190px] flex-shrink-0 cursor-pointer select-none items-center gap-3 rounded-md border border-white/20 p-3 text-white transition-colors duration-200 hover:bg-gray-500/10"
          onClick={() => {
            handleCreatePrompt();
            setSearchTerm('');
          }}
        >
          <IconPlus size={16} />
          {t('New prompt')}
        </button>

        <button
          className="ml-2 flex flex-shrink-0 cursor-pointer items-center gap-3 rounded-md border border-white/20 p-3 text-sm text-white transition-colors duration-200 hover:bg-gray-500/10"
          onClick={() => handleCreateFolder(t('New folder'), 'prompt')}
        >
          <IconFolderPlus size={16} />
        </button>
      </div>

      {prompts.length > 1 && (
        <Search
          placeholder={t('Search prompts...') || ''}
          searchTerm={searchTerm}
          onSearch={setSearchTerm}
        />
      )}

      <div className="flex-grow overflow-auto">
        {folders.length > 0 && (
          <div className="flex border-b border-white/20 pb-2">
            <PromptFolders
              searchTerm={searchTerm}
              prompts={filteredPrompts}
              folders={folders}
              onUpdateFolder={handleUpdateFolder}
              onDeleteFolder={handleDeleteFolder}
              onDeletePrompt={handleDelete}
              onUpdatePrompt={handleUpdate}
            />
          </div>
        )}

        {prompts.length > 0 ? (
          <div
            className="pt-2"
            onDrop={(e) => handleDrop(e)}
            onDragOver={allowDrop}
            onDragEnter={highlightDrop}
            onDragLeave={removeHighlight}
          >
            <Prompts
              prompts={filteredPrompts.filter((prompt) => !prompt.folderId)}
              onUpdatePrompt={handleUpdate}
              onDeletePrompt={handleDelete}
            />
          </div>
        ) : (
          <div className="mt-8 select-none text-center text-white opacity-50">
            <IconMistOff className="mx-auto mb-3" />
            <span className="text-[14px] leading-normal">
              {t('No prompts.')}
            </span>
          </div>
        )}
      </div>

      <PromptbarSettings />
    </div>
  );
};
