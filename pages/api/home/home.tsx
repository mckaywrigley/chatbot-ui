import { useEffect, useRef, useState } from 'react';
import { useQuery } from 'react-query';

import { GetServerSideProps } from 'next';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Head from 'next/head';

import { useCreateReducer } from '@/hooks/useCreateReducer';

import useErrorService from '@/services/errorService';
import useApiService from '@/services/useApiService';

import { getClientSideUser } from '@/utils/app/auth/session';
import {
  cleanConversationHistory,
  cleanSelectedConversation,
} from '@/utils/app/clean';
import {
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_TEMPERATURE,
  STORAGE_TYPE,
} from '@/utils/app/const';
import {
  storageCreateConversation,
  storageUpdateConversation,
} from '@/utils/app/storage/conversation';
import {
  storageGetConversations,
  storageUpdateConversations,
} from '@/utils/app/storage/conversations';
import {
  localDeleteAPIKey,
  localGetAPIKey,
} from '@/utils/app/storage/documentBased/local/apiKey';
import { localGetPluginKeys } from '@/utils/app/storage/documentBased/local/pluginKeys';
import {
  localGetShowChatBar,
  localGetShowPromptBar,
} from '@/utils/app/storage/documentBased/local/uiState';
import {
  storageCreateFolder,
  storageDeleteFolder,
  storageUpdateFolder,
} from '@/utils/app/storage/folder';
import { storageGetFolders } from '@/utils/app/storage/folders';
import { storageUpdateMessage } from '@/utils/app/storage/message';
import {
  storageCreateMessages,
  storageDeleteMessages,
  storageUpdateMessages,
} from '@/utils/app/storage/messages';
import {
  storageGetPrompts,
  storageUpdatePrompts,
} from '@/utils/app/storage/prompts';
import {
  getSelectedConversation,
  saveSelectedConversation,
} from '@/utils/app/storage/selectedConversation';
import { getSettings, saveSettings } from '@/utils/app/storage/settings';
import {
  storageCreateSystemPrompt,
  storageDeleteSystemPrompt,
  storageUpdateSystemPrompt,
} from '@/utils/app/storage/systemPrompt';
import { storageGetSystemPrompts } from '@/utils/app/storage/systemPrompts';

import { Conversation, Message } from '@/types/chat';
import { KeyValuePair } from '@/types/data';
import { FolderType } from '@/types/folder';
import { OpenAIModelID, OpenAIModels, fallbackModelID } from '@/types/openai';
import { PluginKey } from '@/types/plugin';
import { Prompt } from '@/types/prompt';
import { Settings } from '@/types/settings';
import { StorageType } from '@/types/storage';
import { SystemPrompt } from '@/types/systemPrompt';

import { Chat } from '@/components/Chat/Chat';
import { Chatbar } from '@/components/Chatbar/Chatbar';
import { Navbar } from '@/components/Mobile/Navbar';
import Promptbar from '@/components/Promptbar';

import HomeContext from './home.context';
import { HomeInitialState, initialState } from './home.state';

import { v4 as uuidv4 } from 'uuid';

interface Props {
  serverSideApiKeyIsSet: boolean;
  serverSidePluginKeysSet: boolean;
  defaultModelId: OpenAIModelID;
  storageType: StorageType;
}

const Home = ({
  serverSideApiKeyIsSet,
  serverSidePluginKeysSet,
  defaultModelId,
  storageType,
}: Props) => {
  const { t } = useTranslation('chat');
  const { getModels } = useApiService();
  const { getModelsError } = useErrorService();
  const [initialRender, setInitialRender] = useState<boolean>(true);

  const contextValue = useCreateReducer<HomeInitialState>({
    initialState,
  });

  const {
    state: {
      apiKey,
      lightMode,
      folders,
      conversations,
      selectedConversation,
      prompts,
      systemPrompts,
      defaultSystemPromptId,
      user,
    },
    dispatch,
  } = contextValue;

  const stopConversationRef = useRef<boolean>(false);

  const { data, error, refetch } = useQuery(
    ['GetModels', apiKey, serverSideApiKeyIsSet],
    ({ signal }) => {
      if (!apiKey && !serverSideApiKeyIsSet) return null;

      return getModels(
        {
          key: apiKey,
        },
        signal,
      );
    },
    { enabled: true, refetchOnMount: false },
  );

  useEffect(() => {
    if (data) dispatch({ field: 'models', value: data });
  }, [data, dispatch]);

  useEffect(() => {
    dispatch({ field: 'modelError', value: getModelsError(error) });
  }, [dispatch, error, getModelsError]);

  // FETCH MODELS ----------------------------------------------

  const handleSelectConversation = (conversation: Conversation) => {
    dispatch({
      field: 'selectedConversation',
      value: conversation,
    });

    saveSelectedConversation(user, conversation);
  };

  // FOLDER OPERATIONS  --------------------------------------------

  const handleCreateFolder = async (name: string, type: FolderType) => {
    const updatedFolders = storageCreateFolder(
      storageType,
      user,
      name,
      type,
      folders,
    );

    dispatch({ field: 'folders', value: updatedFolders });
  };

  const handleDeleteFolder = async (folderId: string) => {
    const updatedFolders = folders.filter((f) => f.id !== folderId);
    dispatch({ field: 'folders', value: updatedFolders });

    const updatedConversations: Conversation[] = conversations.map((c) => {
      if (c.folderId === folderId) {
        return {
          ...c,
          folderId: null,
        };
      }

      return c;
    });

    dispatch({ field: 'conversations', value: updatedConversations });

    const updatedPrompts: Prompt[] = prompts.map((p) => {
      if (p.folderId === folderId) {
        return {
          ...p,
          folderId: null,
        };
      }

      return p;
    });

    dispatch({ field: 'prompts', value: updatedPrompts });

    await storageUpdateConversations(storageType, user, updatedConversations);
    await storageUpdatePrompts(storageType, user, updatedPrompts);
    storageDeleteFolder(storageType, user, folderId, folders);
  };

  const handleUpdateFolder = async (folderId: string, name: string) => {
    const updatedFolders = storageUpdateFolder(
      storageType,
      user,
      folderId,
      name,
      folders,
    );

    dispatch({ field: 'folders', value: updatedFolders });
  };

  // CONVERSATION OPERATIONS  --------------------------------------------

  const handleNewConversation = async () => {
    const lastConversation = conversations[conversations.length - 1];

    const defaultSystemPrompt = systemPrompts.find(
      (p) => p.id === defaultSystemPromptId,
    );

    let systemPrompt = DEFAULT_SYSTEM_PROMPT;
    if (defaultSystemPrompt) {
      systemPrompt = defaultSystemPrompt.content;
    }

    const newConversation: Conversation = {
      id: uuidv4(),
      name: `${t('New Conversation')}`,
      messages: [],
      model: lastConversation?.model || {
        id: OpenAIModels[defaultModelId].id,
        name: OpenAIModels[defaultModelId].name,
        maxLength: OpenAIModels[defaultModelId].maxLength,
        tokenLimit: OpenAIModels[defaultModelId].tokenLimit,
      },
      prompt: systemPrompt,
      temperature: DEFAULT_TEMPERATURE,
      folderId: null,
    };

    const updatedConversations = storageCreateConversation(
      storageType,
      user,
      newConversation,
      conversations,
    );
    dispatch({ field: 'selectedConversation', value: newConversation });
    dispatch({ field: 'conversations', value: updatedConversations });

    saveSelectedConversation(user, newConversation);

    dispatch({ field: 'loading', value: false });
  };

  const handleUpdateConversation = (
    conversation: Conversation,
    data: KeyValuePair,
  ) => {
    const updatedConversation = {
      ...conversation,
      [data.key]: data.value,
    };

    let update: {
      single: Conversation;
      all: Conversation[];
    };

    if (data.key === 'messages') {
      const messages = conversation.messages;
      const updatedMessageList = data.value as Message[];

      const deletedMessages = messages.filter(
        (m) => !updatedMessageList.includes(m),
      );

      const updatedMessages = messages.filter((m) =>
        updatedMessageList.includes(m),
      );

      const deletedMessageIds = deletedMessages.map((m) => m.id);

      const cleaned = storageDeleteMessages(
        storageType,
        user,
        deletedMessageIds,
        conversation,
        messages,
        conversations,
      );

      const cleanConversation = cleaned.single;
      const cleanConversations = cleaned.all;

      update = storageUpdateMessages(
        storageType,
        user,
        cleanConversation,
        updatedMessages,
        cleanConversations,
      );
    } else {
      update = storageUpdateConversation(
        storageType,
        user,
        updatedConversation,
        conversations,
      );
    }

    dispatch({ field: 'selectedConversation', value: update.single });
    dispatch({ field: 'conversations', value: update.all });
    saveSelectedConversation(user, update.single);
  };

  // SYSTEM PROMPT OPERATIONS  --------------------------------------------

  const handleCreateSystemPrompt = async () => {
    const newSystemPrompt: SystemPrompt = {
      id: uuidv4(),
      name: `${t('New System Prompt')}`,
      content: DEFAULT_SYSTEM_PROMPT,
    };

    const updatedSystemPrompts = storageCreateSystemPrompt(
      storageType,
      user,
      newSystemPrompt,
      systemPrompts,
    );

    dispatch({ field: 'systemPrompts', value: updatedSystemPrompts });
  };

  const handleUpdateSystemPrompt = (updatedSystemPrompt: SystemPrompt) => {
    let update: {
      single: SystemPrompt;
      all: SystemPrompt[];
    };

    update = storageUpdateSystemPrompt(
      storageType,
      user,
      updatedSystemPrompt,
      systemPrompts,
    );

    dispatch({ field: 'systemPrompts', value: update.all });
  };

  const handleDeleteSystemPrompt = (systemPromptId: string) => {
    const updatedSystemPrompts = systemPrompts.filter(
      (s) => s.id !== systemPromptId,
    );

    if (defaultSystemPromptId === systemPromptId) {
      // Resetting default system prompt to built-in
      const settings: Settings = getSettings(user);
      saveSettings(user, { ...settings, defaultSystemPromptId: '0' });
      dispatch({ field: 'defaultSystemPromptId', value: '0' });
    }
    dispatch({ field: 'systemPrompts', value: updatedSystemPrompts });

    storageDeleteSystemPrompt(storageType, user, systemPromptId, systemPrompts);
  };

  // EFFECTS  --------------------------------------------

  useEffect(() => {
    if (window.innerWidth < 640) {
      dispatch({ field: 'showChatbar', value: false });
    }
  }, [dispatch, selectedConversation]);

  useEffect(() => {
    defaultModelId &&
      dispatch({ field: 'defaultModelId', value: defaultModelId });
    storageType && dispatch({ field: 'storageType', value: storageType });
    serverSideApiKeyIsSet &&
      dispatch({
        field: 'serverSideApiKeyIsSet',
        value: serverSideApiKeyIsSet,
      });
    serverSidePluginKeysSet &&
      dispatch({
        field: 'serverSidePluginKeysSet',
        value: serverSidePluginKeysSet,
      });
  }, [
    defaultModelId,
    storageType,
    serverSideApiKeyIsSet,
    serverSidePluginKeysSet,
    dispatch,
  ]);

  // ON LOAD --------------------------------------------

  useEffect(() => {
    const settings = getSettings(user);
    if (settings.theme) {
      dispatch({
        field: 'lightMode',
        value: settings.theme,
      });
    }
    if (settings.defaultSystemPromptId) {
      dispatch({
        field: 'defaultSystemPromptId',
        value: settings.defaultSystemPromptId,
      });
    }

    const apiKey = localGetAPIKey(user);

    if (serverSideApiKeyIsSet) {
      dispatch({ field: 'apiKey', value: '' });

      localDeleteAPIKey(user);
    } else if (apiKey) {
      dispatch({ field: 'apiKey', value: apiKey });
    }

    const pluginKeys = localGetPluginKeys(user);

    if (serverSidePluginKeysSet) {
      dispatch({ field: 'pluginKeys', value: [] });
      localDeleteAPIKey(user);
    } else if (pluginKeys) {
      dispatch({ field: 'pluginKeys', value: pluginKeys });
    }

    if (window.innerWidth < 640) {
      dispatch({ field: 'showChatbar', value: false });
      dispatch({ field: 'showPromptbar', value: false });
    }

    const showChatbar = localGetShowChatBar(user);
    if (showChatbar) {
      dispatch({ field: 'showChatbar', value: showChatbar });
    }

    const showPromptbar = localGetShowPromptBar(user);
    if (showPromptbar) {
      dispatch({ field: 'showPromptbar', value: showPromptbar });
    }

    storageGetFolders(storageType, user).then((folders) => {
      if (folders) {
        dispatch({ field: 'folders', value: folders });
      }
    });

    storageGetPrompts(storageType, user).then((prompts) => {
      if (prompts) {
        dispatch({ field: 'prompts', value: prompts });
      }
    });

    storageGetSystemPrompts(storageType, user).then((systemPrompts) => {
      if (systemPrompts) {
        dispatch({ field: 'systemPrompts', value: systemPrompts });
      }
    });

    storageGetConversations(storageType, user).then((conversationHistory) => {
      if (conversationHistory) {
        const parsedConversationHistory: Conversation[] = conversationHistory;
        const cleanedConversationHistory = cleanConversationHistory(
          parsedConversationHistory,
        );

        dispatch({ field: 'conversations', value: cleanedConversationHistory });
      }
    });

    const selectedConversation = getSelectedConversation(user);
    if (selectedConversation) {
      const parsedSelectedConversation: Conversation =
        JSON.parse(selectedConversation);
      const cleanedSelectedConversation = cleanSelectedConversation(
        parsedSelectedConversation,
      );

      dispatch({
        field: 'selectedConversation',
        value: cleanedSelectedConversation,
      });
    } else {
      dispatch({
        field: 'selectedConversation',
        value: {
          id: uuidv4(),
          name: 'New conversation',
          messages: [],
          model: OpenAIModels[defaultModelId],
          prompt: DEFAULT_SYSTEM_PROMPT,
          temperature: DEFAULT_TEMPERATURE,
          folderId: null,
        },
      });
    }
  }, [
    defaultModelId,
    storageType,
    dispatch,
    serverSideApiKeyIsSet,
    serverSidePluginKeysSet,
  ]);

  return (
    <HomeContext.Provider
      value={{
        ...contextValue,
        handleNewConversation,
        handleCreateFolder,
        handleDeleteFolder,
        handleUpdateFolder,
        handleSelectConversation,
        handleUpdateConversation,
        handleCreateSystemPrompt,
        handleUpdateSystemPrompt,
        handleDeleteSystemPrompt,
      }}
    >
      <Head>
        <title>Chatbot UI</title>
        <meta name="description" content="ChatGPT but better." />
        <meta
          name="viewport"
          content="height=device-height ,width=device-width, initial-scale=1, user-scalable=no"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      {selectedConversation && (
        <main
          className={`flex h-screen w-screen flex-col text-sm text-white dark:text-white ${lightMode}`}
        >
          <div className="fixed top-0 w-full sm:hidden">
            <Navbar
              selectedConversation={selectedConversation}
              onNewConversation={handleNewConversation}
            />
          </div>

          <div className="flex h-full w-full pt-[48px] sm:pt-0">
            <Chatbar />

            <div className="flex flex-1">
              <Chat stopConversationRef={stopConversationRef} />
            </div>

            <Promptbar />
          </div>
        </main>
      )}
    </HomeContext.Provider>
  );
};
export default Home;

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  const defaultModelId =
    (process.env.DEFAULT_MODEL &&
      Object.values(OpenAIModelID).includes(
        process.env.DEFAULT_MODEL as OpenAIModelID,
      ) &&
      process.env.DEFAULT_MODEL) ||
    fallbackModelID;

  const storageType = STORAGE_TYPE;

  let serverSidePluginKeysSet = false;

  const googleApiKey = process.env.GOOGLE_API_KEY;
  const googleCSEId = process.env.GOOGLE_CSE_ID;

  if (googleApiKey && googleCSEId) {
    serverSidePluginKeysSet = true;
  }

  return {
    props: {
      serverSideApiKeyIsSet: !!process.env.OPENAI_API_KEY,
      defaultModelId,
      storageType,
      serverSidePluginKeysSet,
      ...(await serverSideTranslations(locale ?? 'en', [
        'common',
        'chat',
        'sidebar',
        'markdown',
        'promptbar',
      ])),
    },
  };
};
