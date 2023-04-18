import { useContext } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useMutation } from 'react-query';

import useApiService from '@/services/useApiService';
import useStorageService from '@/services/useStorageService';

import { HomeUpdater } from '@/utils/app/homeUpdater';

import {
  ChatModeRunner,
  ChatModeRunnerParams,
  Conversation,
} from '@/types/chat';

import HomeContext from '@/pages/api/home/home.context';

export function useGoogleMode(conversations: Conversation[]): ChatModeRunner {
  const { t: errT } = useTranslation('error');
  const {
    state: { chatModeKeys },
    dispatch: homeDispatch,
  } = useContext(HomeContext);
  const apiService = useApiService();
  const storageService = useStorageService();
  const updater = new HomeUpdater(homeDispatch);
  const mutation = useMutation({
    mutationFn: async (params: ChatModeRunnerParams) => {
      return apiService.googleSearch(params);
    },
    onMutate: async (variables) => {
      variables.body.googleAPIKey = chatModeKeys
        .find((key) => key.chatModeId === 'google-search')
        ?.requiredKeys.find((key) => key.key === 'GOOGLE_API_KEY')?.value;
      variables.body.googleCSEId = chatModeKeys
        .find((key) => key.chatModeId === 'google-search')
        ?.requiredKeys.find((key) => key.key === 'GOOGLE_CSE_ID')?.value;
      homeDispatch({
        field: 'selectedConversation',
        value: variables.conversation,
      });
      homeDispatch({ field: 'loading', value: true });
      homeDispatch({ field: 'messageIsStreaming', value: true });
    },
    async onSuccess(response: any, variables, context) {
      let { conversation: updatedConversation, selectedConversation } =
        variables;

      const { answer } = await response.json();
      updatedConversation = updater.addMessage(updatedConversation, {
        role: 'assistant',
        content: answer,
      });
      await storageService.saveSelectedConversation(updatedConversation);
      const updatedConversations: Conversation[] = conversations.map(
        (conversation) => {
          if (conversation.id === selectedConversation.id) {
            return updatedConversation;
          }
          return conversation;
        },
      );
      if (updatedConversations.length === 0) {
        updatedConversations.push(updatedConversation);
      }
      homeDispatch({ field: 'conversations', value: updatedConversations });
      await storageService.saveConversations(updatedConversations);
      homeDispatch({ field: 'loading', value: false });
      homeDispatch({ field: 'messageIsStreaming', value: false });
    },
    onError: async (error) => {
      homeDispatch({ field: 'loading', value: false });
      homeDispatch({ field: 'messageIsStreaming', value: false });
      if (error instanceof Response) {
        const json = await error.json();
        toast.error(errT(json.error || json.message || 'error'));
      } else {
        toast.error(error?.toString() || 'error');
      }
    },
  });

  return {
    run: (params: ChatModeRunnerParams) => {
      mutation.mutate(params);
    },
  };
}
