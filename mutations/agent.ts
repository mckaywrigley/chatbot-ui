import { MutableRefObject, useContext } from 'react';
import toast from 'react-hot-toast';
import { useMutation } from 'react-query';

import useApiService from '@/services/useApiService';

import { saveConversation, saveConversations } from '@/utils/app/conversation';

import { Action, Answer, ToolActionResult } from '@/types/agent';
import { ChatBody, Conversation, Message } from '@/types/chat';

import HomeContext from '@/pages/api/home/home.context';

type AgentParams = {
  body: ChatBody;
  message: Message;
  conversation: Conversation;
  selectedConversation: Conversation;
};

export function useAgent(conversations: Conversation[]) {
  const {
    state: { pluginKeys },
    dispatch: homeDispatch,
  } = useContext(HomeContext);
  const apiService = useApiService();
  const mutation = useMutation({
    mutationFn: async (params: AgentParams): Promise<Answer> => {
      let planningCount = 0;
      let lastToolActionResult: ToolActionResult | undefined;
      while (true) {
        if (planningCount > 5) {
          // todo: handle this
          return { type: 'answer', answer: 'No Result' };
        }
        const planningResponse = await apiService.planning({
          model: params.body.model,
          messages: params.body.messages,
          prompt: params.body.prompt,
          temperature: params.body.temperature,
          toolActionResult: lastToolActionResult,
        });
        console.log(planningResponse);
        if (planningResponse.type === 'action') {
          planningCount++;
          // todo: execute tool
          lastToolActionResult = await apiService.executeTool({
            model: params.body.model,
            input: planningResponse.toolInput,
            toolAction: planningResponse,
          });
          console.log(lastToolActionResult);
        } else {
          console.log('answer', planningResponse);
          return { type: 'answer', answer: planningResponse.answer };
        }
      }
    },
    onMutate: async (variables) => {
      homeDispatch({
        field: 'selectedConversation',
        value: variables.conversation,
      });
      homeDispatch({ field: 'loading', value: true });
      homeDispatch({ field: 'messageIsStreaming', value: true });
    },
    async onSuccess(answer: Answer, variables, context) {
      let {
        conversation: updatedConversation,
        message,
        selectedConversation,
      } = variables;

      const updatedMessages: Message[] = [
        ...updatedConversation.messages,
        { role: 'assistant', content: answer.answer },
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

  return {
    run: (params: AgentParams) => {
      mutation.mutate(params);
    },
  };
}
