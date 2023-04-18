import { MutableRefObject, useContext } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useMutation } from 'react-query';

import useApiService from '@/services/useApiService';
import useStorageService from '@/services/useStorageService';

import { updateConversationFromStream } from '@/utils/app/clientstream';

import { ChatBody, ChatModeRunner, Conversation, Message } from '@/types/chat';

import HomeContext from '@/pages/api/home/home.context';

export type ChatPluginParams = {
  body: ChatBody;
  message: Message;
  conversation: Conversation;
  selectedConversation: Conversation;
};

export function useDirectMode(
  conversations: Conversation[],
  stopConversationRef: MutableRefObject<boolean>,
): ChatModeRunner {
  const { t: errT } = useTranslation('error');

  const { dispatch: homeDispatch } = useContext(HomeContext);
  const apiService = useApiService();
  const storageService = useStorageService();
  const mutation = useMutation({
    mutationFn: async (params: ChatPluginParams) => {
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
      homeDispatch({ field: 'messageIsStreaming', value: false });
    },
    onError: async (error) => {
      console.log(error);
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
    run: (params: ChatPluginParams) => mutation.mutate(params),
  };
}
