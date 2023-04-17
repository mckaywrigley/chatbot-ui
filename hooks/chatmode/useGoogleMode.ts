import { useContext } from 'react';
import toast from 'react-hot-toast';
import { useMutation } from 'react-query';

import useApiService from '@/services/useApiService';

import { saveConversation, saveConversations } from '@/utils/app/conversation';
import { HomeUpdater } from '@/utils/app/homeUpdater';

import { ChatModeRunner, ChatPluginParams, Conversation } from '@/types/chat';

import HomeContext from '@/pages/api/home/home.context';

export function useGoogleMode(conversations: Conversation[]): ChatModeRunner {
  const {
    state: { chatModeKeys },
    dispatch: homeDispatch,
  } = useContext(HomeContext);
  const apiService = useApiService();
  const updater = new HomeUpdater(homeDispatch);
  const mutation = useMutation({
    mutationFn: async (params: ChatPluginParams) => {
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
      saveConversation(updatedConversation);
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
      saveConversations(updatedConversations);
      homeDispatch({ field: 'loading', value: false });
      homeDispatch({ field: 'messageIsStreaming', value: false });
    },
    onError: (error) => {
      homeDispatch({ field: 'loading', value: false });
      homeDispatch({ field: 'messageIsStreaming', value: false });
      toast.error(error?.toString() || 'error');
    },
  });

  return {
    run: (params: ChatPluginParams) => {
      mutation.mutate(params);
    },
  };
}
