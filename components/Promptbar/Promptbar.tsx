import { useContext, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useCreateReducer } from '@/hooks/useCreateReducer';
import useMediaQuery from '@/hooks/useMediaQuery';

import { savePrompts } from '@/utils/app/prompts';

import { OpenAIModels } from '@/types/openai';
import { Prompt } from '@/types/prompt';

import HomeContext from '@/pages/api/home/home.context';

import { PromptFolders } from './components/PromptFolders';
import { Prompts } from './components/Prompts';

import Sidebar from '../Sidebar';
import PromptbarContext from './PromptBar.context';
import { PromptbarInitialState, initialState } from './Promptbar.state';

import { updateConversationLastUpdatedAtTimeStamp, getNonDeletedCollection } from '@/utils/app/conversation';

import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';

const Promptbar = () => {
  const { t } = useTranslation('promptbar');

  const promptBarContextValue = useCreateReducer<PromptbarInitialState>({
    initialState,
  });

  const {
    state: { prompts, defaultModelId, showChatbar, showPromptbar },
    dispatch: homeDispatch,
    handleCreateFolder,
  } = useContext(HomeContext);

  const isMobileLayout = useMediaQuery('(max-width: 640px)');

  const showMobileButtons = useMemo(() => {
    return isMobileLayout && !showChatbar;
  }, [isMobileLayout, showChatbar]);

  const {
    state: { searchTerm, filteredPrompts },
    dispatch: promptDispatch,
  } = promptBarContextValue;

  const handleTogglePromptbar = () => {
    homeDispatch({ field: 'showPromptbar', value: !showPromptbar });
    localStorage.setItem('showPromptbar', JSON.stringify(!showPromptbar));
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
        lastUpdateAtUTC: dayjs().valueOf(),
      };

      const updatedPrompts = [...prompts, newPrompt];

      homeDispatch({ field: 'prompts', value: updatedPrompts });

      savePrompts(updatedPrompts);

      updateConversationLastUpdatedAtTimeStamp();
    }
  };

  const handleDeletePrompt = (prompt: Prompt) => {
    const updatedPrompts = prompts.map((p) => {
      if (p.id === prompt.id) {
        return {
          ...prompt,
          deleted: true,
        };
      }
      
      return p;
    });

    homeDispatch({ field: 'prompts', value: updatedPrompts });
    savePrompts(updatedPrompts);
    updateConversationLastUpdatedAtTimeStamp();
  };

  const handleUpdatePrompt = (prompt: Prompt) => {
    const updatedPrompts = prompts.map((p) => {
      if (p.id === prompt.id) {
        return {
          ...prompt,
          lastUpdateAtUTC: dayjs().valueOf(),
        };
      }

      return p;
    });
    homeDispatch({ field: 'prompts', value: updatedPrompts });

    savePrompts(updatedPrompts);

    updateConversationLastUpdatedAtTimeStamp();
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

  useEffect(() => {
    if (searchTerm) {
      promptDispatch({
        field: 'filteredPrompts',
        value: getNonDeletedCollection(prompts.filter((prompt) => {
          const searchable =
            prompt.name.toLowerCase() +
            ' ' +
            prompt.description.toLowerCase() +
            ' ' +
            prompt.content.toLowerCase();
          return searchable.includes(searchTerm.toLowerCase());
        })),
      });
    } else {
      promptDispatch({ field: 'filteredPrompts', value: getNonDeletedCollection(prompts) });
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
        handleCreateItem={handleCreatePrompt}
        handleCreateFolder={() => handleCreateFolder(t('New folder'), 'prompt')}
        handleDrop={handleDrop}
        showMobileButton={showMobileButtons}
      />
    </PromptbarContext.Provider>
  );
};

export default Promptbar;
