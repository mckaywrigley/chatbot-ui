import { useEffect, useState, useContext } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Prompt } from '@/types/prompt';
import { IconFolderPlus, IconMistOff, IconPlus } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { PromptFolders } from './components/PromptFolders';
import { Search } from '../Search/Search';
import { PromptbarSettings } from './components/PromptbarSettings';
import { Prompts } from './components/Prompts';
import { savePrompts } from '@/utils/app/prompts';

import PromptbarContext from './PromptBar.context';
import { useCreateReducer } from '@/hooks/useCreateReducer';
import { PromptbarInitialState, initialState } from './Promptbar.state';
import HomeContext from '@/pages/api/home/home.context';
import { OpenAIModels } from '@/types/openai';

const Promptbar = () => {
  const { t } = useTranslation('promptbar');

  const {
    state: { prompts, folders, defaultModelId },
    dispatch: homeDispatch,
    handleCreateFolder,
  } = useContext(HomeContext);

  const promptBarContextValue = useCreateReducer<PromptbarInitialState>({
    initialState,
  });

  const {
    state: { searchTerm, filteredPrompts },
    dispatch: promptDispatch,
  } = promptBarContextValue;

  const handleSearchTermChange = (searchTerm: string) => {
    promptDispatch({ field: 'searchTerm', value: searchTerm });
  };

  const handleCreatePrompt = () => {
    if (defaultModelId) {
      const newPrompt: Prompt = {
        id: uuidv4(),
        name: `Prompt ${prompts.length + 1}`,
        description: '',
        content: '',
        model: OpenAIModels[defaultModelId],
        folderId: null,
      };

      const updatedPrompts = [...prompts, newPrompt];

      homeDispatch({ field: 'prompts', value: updatedPrompts });

      savePrompts(updatedPrompts);
    }
  };

  const handleDeletePrompt = (prompt: Prompt) => {
    const updatedPrompts = prompts.filter((p) => p.id !== prompt.id);

    homeDispatch({ field: 'prompts', value: updatedPrompts });
    savePrompts(updatedPrompts);
  };

  const handleUpdatePrompt = (prompt: Prompt) => {
    const updatedPrompts = prompts.map((p) => {
      if (p.id === prompt.id) {
        return prompt;
      }

      return p;
    });
    homeDispatch({ field: 'prompts', value: updatedPrompts });

    savePrompts(updatedPrompts);
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
      promptDispatch({
        field: 'filteredPrompts',
        value: prompts.filter((prompt) => {
          const searchable =
            prompt.name.toLowerCase() +
            ' ' +
            prompt.description.toLowerCase() +
            ' ' +
            prompt.content.toLowerCase();
          return searchable.includes(searchTerm.toLowerCase());
        }),
      });
    } else {
      promptDispatch({ field: 'filteredPrompts', value: prompts });
    }
  }, [searchTerm, prompts]);

  return (
    <PromptbarContext.Provider
      value={{
        ...promptBarContextValue,
        handleCreatePrompt,
        handleDeletePrompt,
        handleUpdatePrompt,
      }}
    >
      <div
        className={`fixed top-0 right-0 z-50 flex h-full w-[260px] flex-none flex-col space-y-2 bg-[#202123] p-2 text-[14px] transition-all sm:relative sm:top-0`}
      >
        <div className="flex items-center">
          <button
            className="text-sidebar flex w-[190px] flex-shrink-0 cursor-pointer select-none items-center gap-3 rounded-md border border-white/20 p-3 text-white transition-colors duration-200 hover:bg-gray-500/10"
            onClick={() => {
              handleCreatePrompt();
              promptDispatch({ field: 'searchTerm', value: '' });
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
            onSearch={handleSearchTermChange}
          />
        )}

        <div className="flex-grow overflow-auto">
          {folders.length > 0 && (
            <div className="flex border-b border-white/20 pb-2">
              <PromptFolders />
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
    </PromptbarContext.Provider>
  );
};

export default Promptbar;
