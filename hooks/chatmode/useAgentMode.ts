import { useContext } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useMutation } from 'react-query';

import useApiService from '@/services/useApiService';

import { saveConversation, saveConversations } from '@/utils/app/conversation';
import { HomeUpdater } from '@/utils/app/homeUpdater';

import { Answer, ToolActionResult } from '@/types/agent';
import {
  ChatModeRunner,
  ChatModeRunnerParams,
  Conversation,
} from '@/types/chat';

import HomeContext from '@/pages/api/home/home.context';

export function useAgentMode(conversations: Conversation[]): ChatModeRunner {
  const { t } = useTranslation('chat');

  const {
    state: { chatModeKeys: pluginKeys },
    dispatch: homeDispatch,
  } = useContext(HomeContext);
  const apiService = useApiService();
  const updater = new HomeUpdater(homeDispatch);
  const mutation = useMutation({
    mutationFn: async (params: ChatModeRunnerParams): Promise<Answer> => {
      let planningCount = 0;
      let toolActionResults: ToolActionResult[] = [];
      while (true) {
        if (planningCount > 5) {
          // todo: handle this
          return { type: 'answer', answer: 'No Result' };
        }
        const planningResponse = await apiService.planning({
          messages: params.body.messages,
          toolActionResults,
          enabledToolNames: params.plugins.map((p) => p.nameForModel),
        });
        if (planningResponse.type === 'action') {
          planningCount++;
          const tool = planningResponse.tool;
          if (tool.displayForUser) {
            params.conversation = updater.addMessage(params.conversation, {
              role: 'assistant',
              content: `${tool.nameForHuman} ${t('executing...')}`,
            });
          }
          const actinoResult = await apiService.runTool({
            model: params.body.model,
            input: planningResponse.toolInput,
            toolAction: planningResponse,
          });
          toolActionResults.push(actinoResult);
        } else {
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
      let { conversation: updatedConversation, selectedConversation } =
        variables;

      updatedConversation = updater.addMessage(updatedConversation, {
        role: 'assistant',
        content: answer.answer,
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
    run: (params: ChatModeRunnerParams) => {
      mutation.mutate(params);
    },
  };
}
