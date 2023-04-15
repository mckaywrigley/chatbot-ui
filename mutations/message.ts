import { Dispatch, MutableRefObject } from 'react';
import toast from 'react-hot-toast';
import { useMutation } from 'react-query';

import { ActionType } from '@/hooks/useCreateReducer';

import useApiService from '@/services/useApiService';

import { saveConversation, saveConversations } from '@/utils/app/conversation';
import { updateConversationFromStream } from '@/utils/server/clientstream';

import { ChatBody, Conversation, Message } from '@/types/chat';

import { HomeInitialState } from '@/pages/api/home/home.state';

export function useMessageMutation(
  conversations: Conversation[],
  homeDispatch: Dispatch<ActionType<HomeInitialState>>,
  stopConversationRef: MutableRefObject<boolean>,
) {
  const apiService = useApiService();
  return useMutation({
    mutationFn: async (params: {
      body: ChatBody;
      message: Message;
      conversation: Conversation;
      selectedConversation: Conversation;
    }) => {
      return apiService.chat(params);
    },
    onMutate: async (variables) => {
      homeDispatch({
        field: 'selectedConversation',
        value: variables.conversation,
      });
      homeDispatch({ field: 'loading', value: true });
      homeDispatch({ field: 'messageIsStreaming', value: true });
    },
    async onSuccess(response: any, variables, context) {
      const { body: data } = response;
      let {
        conversation: updatedConversation,
        message,
        selectedConversation,
      } = variables;
      if (!data) {
        homeDispatch({ field: 'loading', value: false });
        homeDispatch({ field: 'messageIsStreaming', value: false });
        return;
      }
      if (updatedConversation.messages.length === 1) {
        const { content } = message;
        const customName =
          content.length > 30 ? content.substring(0, 30) + '...' : content;
        updatedConversation = {
          ...updatedConversation,
          name: customName,
        };
      }
      homeDispatch({ field: 'loading', value: false });
      updatedConversation = await updateConversationFromStream(
        data,
        // controller,
        new AbortController(),
        homeDispatch,
        updatedConversation,
        stopConversationRef,
      );
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
      homeDispatch({ field: 'messageIsStreaming', value: false });
    },
    onError: (error) => {
      homeDispatch({ field: 'loading', value: false });
      homeDispatch({ field: 'messageIsStreaming', value: false });
      toast.error(error?.toString() || 'error');
    },
  });
}
