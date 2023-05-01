import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useQuery } from 'react-query';

import { GetServerSideProps } from 'next';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { event } from 'nextjs-google-analytics';

import { useCreateReducer } from '@/hooks/useCreateReducer';

import useErrorService from '@/services/errorService';
import useApiService from '@/services/useApiService';

import { fetchShareableConversation } from '@/utils/app/api';
import {
  cleanConversationHistory,
  cleanSelectedConversation,
} from '@/utils/app/clean';
import { DEFAULT_SYSTEM_PROMPT, DEFAULT_TEMPERATURE } from '@/utils/app/const';
import {
  saveConversation,
  saveConversations,
  updateConversation,
} from '@/utils/app/conversation';
import { syncConversations } from '@/utils/app/conversation';
import { saveFolders } from '@/utils/app/folders';
import { savePrompts } from '@/utils/app/prompts';

import { Conversation } from '@/types/chat';
import { KeyValuePair } from '@/types/data';
import { FolderInterface, FolderType } from '@/types/folder';
import { OpenAIModelID, OpenAIModels, fallbackModelID } from '@/types/openai';
import { Prompt } from '@/types/prompt';
import { UserProfile } from '@/types/user';

import { Chat } from '@/components/Chat/Chat';
import { Chatbar } from '@/components/Chatbar/Chatbar';
import { Navbar } from '@/components/Mobile/Navbar';
import Promptbar from '@/components/Promptbar';
import { AuthModel } from '@/components/User/AuthModel';
import { ProfileModel } from '@/components/User/ProfileModel';
import { UsageCreditModel } from '@/components/User/UsageCreditModel';

import HomeContext from './home.context';
import { HomeInitialState, initialState } from './home.state';

import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  serverSideApiKeyIsSet: boolean;
  serverSidePluginKeysSet: boolean;
  defaultModelId: OpenAIModelID;
  googleAdSenseId: string;
}

const Home = ({
  serverSideApiKeyIsSet,
  serverSidePluginKeysSet,
  defaultModelId,
  googleAdSenseId,
}: Props) => {
  const { t } = useTranslation('chat');
  const { getModels } = useApiService();
  const { getModelsError } = useErrorService();
  const [containerHeight, setContainerHeight] = useState('100vh');
  const router = useRouter();
  const session = useSession();
  const supabase = useSupabaseClient();

  const contextValue = useCreateReducer<HomeInitialState>({
    initialState,
  });

  const {
    state: {
      lightMode,
      folders,
      conversations,
      selectedConversation,
      prompts,
      temperature,
      showLoginSignUpModel,
      showProfileModel,
      showUsageModel,
      user,
      isPaidUser,
      conversationLastSyncAt,
      forceSyncConversation,
    },
    dispatch,
  } = contextValue;

  const stopConversationRef = useRef<boolean>(false);

  const { data, error } = useQuery(
    ['GetModels', serverSideApiKeyIsSet],
    ({ signal }) => {
      if (!serverSideApiKeyIsSet) return null;

      return getModels(signal);
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

    saveConversation(conversation);
  };

  // FOLDER OPERATIONS  --------------------------------------------

  const handleCreateFolder = (name: string, type: FolderType) => {
    const newFolder: FolderInterface = {
      id: uuidv4(),
      name,
      type,
    };

    const updatedFolders = [...folders, newFolder];

    dispatch({ field: 'folders', value: updatedFolders });
    saveFolders(updatedFolders);
  };

  const handleDeleteFolder = (folderId: string) => {
    const updatedFolders = folders.filter((f) => f.id !== folderId);
    dispatch({ field: 'folders', value: updatedFolders });
    saveFolders(updatedFolders);

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
    saveConversations(updatedConversations);

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
    savePrompts(updatedPrompts);
  };

  const handleUpdateFolder = (folderId: string, name: string) => {
    const updatedFolders = folders.map((f) => {
      if (f.id === folderId) {
        return {
          ...f,
          name,
        };
      }

      return f;
    });

    dispatch({ field: 'folders', value: updatedFolders });

    saveFolders(updatedFolders);
  };

  // CONVERSATION OPERATIONS  --------------------------------------------

  const handleNewConversation = () => {
    const lastConversation = conversations[conversations.length - 1];

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
      prompt: DEFAULT_SYSTEM_PROMPT,
      temperature: DEFAULT_TEMPERATURE,
      folderId: null,
    };

    const updatedConversations = [...conversations, newConversation];

    dispatch({ field: 'selectedConversation', value: newConversation });
    dispatch({ field: 'conversations', value: updatedConversations });

    saveConversation(newConversation);
    saveConversations(updatedConversations);

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

    const { single, all } = updateConversation(
      updatedConversation,
      conversations,
    );

    dispatch({ field: 'selectedConversation', value: single });
    dispatch({ field: 'conversations', value: all });

    event('interaction', {
      category: 'Conversation',
      label: 'Create New Conversation',
    });
  };

  // EFFECTS  --------------------------------------------

  useEffect(() => {
    defaultModelId &&
      dispatch({ field: 'defaultModelId', value: defaultModelId });
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
  }, [defaultModelId, serverSideApiKeyIsSet, serverSidePluginKeysSet]);

  // CLOUD SYNC ------------------------------------------

  useEffect(() => {
    if (!user) return;
    if (!isPaidUser) return;

    let conversationLastUpdatedAt = localStorage.getItem(
      'conversationLastUpdatedAt',
    );

    const syncConversationsAction = async () => {
      await syncConversations(
        supabase,
        user,
        // Subtract 1 year to force sync
        conversationLastUpdatedAt || dayjs().subtract(1, 'year').toString(),
      );
    };

    // Sync if we haven't sync for more than 2 minutes or it is the first time syncing upon loading
    if (
      !forceSyncConversation &&
      ((conversationLastSyncAt &&
        dayjs().diff(conversationLastSyncAt, 'minutes') < 2) ||
        !conversationLastUpdatedAt)
    )
      return;

    try {
      dispatch({ field: 'syncingConversation', value: true });
      syncConversationsAction();
    } catch (e) {
      dispatch({ field: 'syncSuccess', value: false });
      console.log('error', e);
    }

    dispatch({ field: 'conversationLastSyncAt', value: dayjs().toString() });
    if (forceSyncConversation) {
      dispatch({ field: 'forceSyncConversation', value: false });
    }
    dispatch({ field: 'syncSuccess', value: true });
    dispatch({ field: 'syncingConversation', value: false });
  }, [
    conversations,
    user,
    supabase,
    dispatch,
    isPaidUser,
    forceSyncConversation,
    conversationLastSyncAt,
  ]);

  // USER AUTH ------------------------------------------
  useEffect(() => {
    if (session?.user) {
      supabase
        .from('profiles')
        .select('plan')
        .eq('id', session.user.id)
        .then(({ data, error }) => {
          if (error) {
            console.log('error', error);
          } else {
            dispatch({ field: 'isPaidUser', value: data[0].plan !== 'free' });
          }

          if (!data || data.length === 0) {
            toast.error(
              t('Unable to load your information, please try again later.'),
            );
            return;
          }

          const userProfile = data[0] as UserProfile;

          dispatch({ field: 'showLoginSignUpModel', value: false });
          dispatch({
            field: 'user',
            value: {
              id: session.user.id,
              email: session.user.email,
              plan: userProfile.plan || 'free',
              token: session.access_token,
            },
          });
        });
    }
  }, [session]);

  const handleUserLogout = async () => {
    await supabase.auth.signOut();
    dispatch({ field: 'user', value: null });
    toast.success(t('You have been logged out'));
  };

  // ON LOAD --------------------------------------------

  useEffect(() => {
    const updateHeight = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);

      // If you want to set the height directly in the state
      setContainerHeight(`${window.innerHeight}px`);
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => {
      window.removeEventListener('resize', updateHeight);
    };
  }, []);

  useEffect(() => {
    const theme = localStorage.getItem('theme');
    if (theme) {
      dispatch({ field: 'lightMode', value: theme as 'dark' | 'light' });
    }

    if (window.innerWidth < 640) {
      dispatch({ field: 'showChatbar', value: false });
      dispatch({ field: 'showPromptbar', value: false });
    }

    const showChatbar = localStorage.getItem('showChatbar');
    if (showChatbar) {
      dispatch({ field: 'showChatbar', value: showChatbar === 'true' });
    }

    const showPromptbar = localStorage.getItem('showPromptbar');
    if (showPromptbar) {
      dispatch({ field: 'showPromptbar', value: showPromptbar === 'true' });
    }

    const folders = localStorage.getItem('folders');
    if (folders) {
      dispatch({ field: 'folders', value: JSON.parse(folders) });
    }

    const prompts = localStorage.getItem('prompts');
    if (prompts) {
      dispatch({ field: 'prompts', value: JSON.parse(prompts) });
    }

    const outputLanguage = localStorage.getItem('outputLanguage');
    if (outputLanguage) {
      dispatch({ field: 'outputLanguage', value: outputLanguage });
    }

    const conversationHistory = localStorage.getItem('conversationHistory');
    let cleanedConversationHistory: Conversation[] = [];
    if (conversationHistory) {
      const parsedConversationHistory: Conversation[] =
        JSON.parse(conversationHistory);
      cleanedConversationHistory = cleanConversationHistory(
        parsedConversationHistory,
      );
      dispatch({ field: 'conversations', value: cleanedConversationHistory });
    }

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

    // Load shareable conversations
    const { shareable_conversation_id: accessibleConversationId } =
      router.query;

    if (!accessibleConversationId) return;

    dispatch({ field: 'loading', value: true });
    fetchShareableConversation(accessibleConversationId as string)
      .then((conversation) => {
        if (conversation) {
          const updatedConversations = [
            ...cleanedConversationHistory,
            conversation,
          ];

          dispatch({ field: 'selectedConversation', value: conversation });
          dispatch({ field: 'conversations', value: updatedConversations });
          saveConversations(updatedConversations);

          toast.success(t('Conversation loaded successfully.'));
          router.replace(router.pathname, router.pathname, { shallow: true });
        }
      })
      .catch(() => {
        toast.error(t('Sorry, we could not find this shared conversation.'));
      })
      .finally(() => {
        dispatch({ field: 'loading', value: false });
      });
  }, [
    defaultModelId,
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
        handleUserLogout,
      }}
    >
      <Head>
        <title>Chat Everywhere</title>
        <meta name="description" content="Use ChatGPT anywhere" />
        <meta
          name="viewport"
          content="height=device-height ,width=device-width, initial-scale=1, user-scalable=no"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      {selectedConversation && (
        <main
          className={`flex h-screen w-screen flex-col text-sm text-white dark:text-white ${lightMode}`}
          style={{ height: containerHeight }}
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
              <Chat
                stopConversationRef={stopConversationRef}
                googleAdSenseId={googleAdSenseId}
              />
            </div>
            {showLoginSignUpModel && (
              <AuthModel
                supabase={supabase}
                onClose={() =>
                  dispatch({ field: 'showLoginSignUpModel', value: false })
                }
              />
            )}
            {showProfileModel && session && (
              <ProfileModel
                session={session}
                onClose={() =>
                  dispatch({ field: 'showProfileModel', value: false })
                }
              />
            )}
            {showUsageModel && session && (
              <UsageCreditModel
                onClose={() =>
                  dispatch({ field: 'showUsageModel', value: false })
                }
              />
            )}
            <Promptbar />
          </div>
        </main>
      )}
    </HomeContext.Provider>
  );
};
export default Home;

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  const defaultModelId = fallbackModelID;

  let serverSidePluginKeysSet = true;
  const googleAdSenseId = process.env.GOOGLE_ADSENSE_ID;

  return {
    props: {
      serverSideApiKeyIsSet: !!process.env.OPENAI_API_KEY,
      defaultModelId,
      serverSidePluginKeysSet,
      googleAdSenseId,
      ...(await serverSideTranslations(locale ?? 'en', [
        'common',
        'chat',
        'sidebar',
        'model',
        'markdown',
        'promptbar',
        'prompts',
        'roles',
        'rolesContent',
        'feature',
      ])),
    },
  };
};
