import { useContext, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useCreateReducer } from '@/hooks/useCreateReducer';
import { savePrompts } from '@/utils/app/prompts';
import { OpenAIModels } from '@/types/openai';
import { Prompt } from '@/types/prompt';
import { PromptFolders } from './components/PromptFolders';
import { Prompts } from './components/Prompts';
import { PromptbarSettings } from './components/PromptbarSettings';
import { PromptbarInitialState, initialState } from './Promptbar.state';
import { v4 as uuidv4 } from 'uuid';
import HomeContext from '@/pages/api/home/home.context';
import Sidebar from '../Sidebar';
import PromptbarContext from './PromptBar.context';

const Promptbar = () => {
  const { t } = useTranslation('promptbar');

  const promptBarContextValue = useCreateReducer<PromptbarInitialState>({
    initialState,
  });

  const {
    state: { prompts, defaultModelId, showPromptbar, folders },
    dispatch: homeDispatch,
    handleCreateFolder,
  } = useContext(HomeContext);

  const {
    state: { searchTerm, filteredPrompts },
    dispatch: promptDispatch,
  } = promptBarContextValue;

  const handleTogglePromptbar = () => {
    homeDispatch({ field: 'showPromptbar', value: !showPromptbar });
    localStorage.setItem('showPromptbar', JSON.stringify(!showPromptbar));
  };

  const handlePrompt = (updater: Function) => {
    return (prompt?:Prompt) => {
      const updatedPrompts = updater(prompt);

      homeDispatch({ field: 'prompts', value: updatedPrompts });
      savePrompts(updatedPrompts);
    }
  }

  const createPrompt = () => {
    if (defaultModelId) {
      const newPrompt: Prompt = {
        id: uuidv4(),
        name: `Prompt ${prompts.length + 1}`,
        description: '',
        content: '',
        model: OpenAIModels[defaultModelId],
        folderId: null,
      };

      return [...prompts, newPrompt];
    }
  };
  const deletePrompt = (prompt: Prompt) =>  prompts.filter((p) => p.id !== prompt.id)
  const updatePrompt = (prompt: Prompt) => prompts.map(p => (p.id === prompt.id) ? prompt: p)
  const handleDrop = (e: any) => {
    if (e.dataTransfer) {
      const prompt = JSON.parse(e.dataTransfer.getData('prompt'));

      const updatedPrompt = {
        ...prompt,
        folderId: e.target.dataset.folderId,
      };

      handlePrompt(updatePrompt)(updatedPrompt);
      e.target.style.background = 'none';
    }
  };

  useEffect(() => {
    if (searchTerm) {
      promptDispatch({
        field: 'filteredPrompts',
        value: prompts.filter((prompt) => {
          const searchable = prompt.name.toLowerCase()
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
        handleCreatePrompt: handlePrompt(createPrompt),
        handleDeletePrompt: handlePrompt(deletePrompt),
        handleUpdatePrompt: handlePrompt(updatePrompt),
      }}
    >
      <Sidebar<Prompt>
        side={'right'}
        isOpen={showPromptbar}
        addItemButtonTitle={t('New prompt')}
        itemComponent={
          <Prompts
            prompts={filteredPrompts.filter((prompt) => !prompt.folderId)}
          />
        }
        folderComponent={<PromptFolders />}
        items={filteredPrompts}
        searchTerm={searchTerm}
        handleSearchTerm={(searchTerm: string) =>
          promptDispatch({ field: 'searchTerm', value: searchTerm })
        }
        toggleOpen={handleTogglePromptbar}
        handleCreateItem={handlePrompt(createPrompt)}
        handleCreateFolder={() => handleCreateFolder(t('New folder'), 'prompt')}
        handleDrop={handleDrop}
        foldersCount={folders.filter((folder) => folder.type === 'prompt').length}
      />
    </PromptbarContext.Provider>
  );
};

export default Promptbar;
