import { Dispatch, MutableRefObject, useContext } from 'react';
import toast from 'react-hot-toast';
import { useMutation } from 'react-query';

import { ActionType } from '@/hooks/useCreateReducer';

import useApiService from '@/services/useApiService';

import { saveConversation, saveConversations } from '@/utils/app/conversation';
import { updateConversationFromStream } from '@/utils/server/clientstream';

import { ChatBody, Conversation, Message } from '@/types/chat';

import HomeContext from '@/pages/api/home/home.context';
import { HomeInitialState } from '@/pages/api/home/home.state';

export function useGooglePluginMessageMutation(
  conversations: Conversation[],
  homeDispatch: Dispatch<ActionType<HomeInitialState>>,
  stopConversationRef: MutableRefObject<boolean>,
) {
  const {
    state: { pluginKeys },
  } = useContext(HomeContext);
  const apiService = useApiService();
  return useMutation({
    mutationFn: async (params: {
      body: ChatBody;
      message: Message;
      conversation: Conversation;
      selectedConversation: Conversation;
    }) => {
      return apiService.googleSearch(params);
    },
    onMutate: async (variables) => {
      variables.body.googleAPIKey = pluginKeys
        .find((key) => key.pluginId === 'google-search')
        ?.requiredKeys.find((key) => key.key === 'GOOGLE_API_KEY')?.value;
      variables.body.googleCSEId = pluginKeys
        .find((key) => key.pluginId === 'google-search')
        ?.requiredKeys.find((key) => key.key === 'GOOGLE_CSE_ID')?.value;
      homeDispatch({
        field: 'selectedConversation',
        value: variables.conversation,
      });
      homeDispatch({ field: 'loading', value: true });
      homeDispatch({ field: 'messageIsStreaming', value: true });
    },
    async onSuccess(response: any, variables, context) {
      let {
        conversation: updatedConversation,
        message,
        selectedConversation,
      } = variables;

      const { answer } = await response.json();
      const updatedMessages: Message[] = [
        ...updatedConversation.messages,
        { role: 'assistant', content: answer },
      ];
      updatedConversation = {
        ...updatedConversation,
        messages: updatedMessages,
      };
      homeDispatch({
        field: 'selectedConversation',
        value: updatedConversation,
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
}
