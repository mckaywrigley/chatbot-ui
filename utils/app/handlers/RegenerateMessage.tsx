import { MutableRefObject } from 'react';
import toast from 'react-hot-toast';

import { storageUpdateConversation } from '@/utils/app/storage/conversation';
import { storageCreateMessage } from '@/utils/app/storage/message';
import { saveSelectedConversation } from '@/utils/app/storage/selectedConversation';

import { User } from '@/types/auth';
import { Conversation, Message } from '@/types/chat';
import { Plugin, PluginKey } from '@/types/plugin';
import { StorageType } from '@/types/storage';

import { sendChatRequest } from '../chat';
import { storageDeleteMessages } from '../storage/messages';

import { v4 as uuidv4 } from 'uuid';

export const regenerateMessageHandler = async (
  user: User,
  message: Message,
  plugin: Plugin | null = null,
  stopConversationRef: MutableRefObject<boolean>,
  selectedConversation: Conversation | undefined,
  conversations: Conversation[],
  storageType: StorageType,
  apiKey: string,
  pluginKeys: PluginKey[],
  homeDispatch: React.Dispatch<any>,
) => {
  if (selectedConversation) {
    const deleteCount = 1;
    let updatedConversation: Conversation;

    const conversationLength = selectedConversation.messages.length;
    const messagesToBeDeleted: string[] = [];

    for (let i = 0; i < deleteCount; i++) {
      const currentMessage =
        selectedConversation.messages[conversationLength - 1 - i];
      messagesToBeDeleted.push(currentMessage.id);
    }
    const deleteUpdate = storageDeleteMessages(
      storageType,
      user,
      messagesToBeDeleted,
      selectedConversation,
      selectedConversation.messages,
      conversations,
    );

    updatedConversation = deleteUpdate.single;

    homeDispatch({
      field: 'selectedConversation',
      value: updatedConversation,
    });

    homeDispatch({ field: 'loading', value: true });
    homeDispatch({ field: 'messageIsStreaming', value: true });

    const { response, controller } = await sendChatRequest(
      updatedConversation,
      plugin,
      apiKey,
      pluginKeys,
    );

    if (!response.ok) {
      homeDispatch({ field: 'loading', value: false });
      homeDispatch({ field: 'messageIsStreaming', value: false });
      toast.error(response.statusText);
      return;
    }
    const data = response.body;
    if (!data) {
      homeDispatch({ field: 'loading', value: false });
      homeDispatch({ field: 'messageIsStreaming', value: false });
      return;
    }

    const assistantMessageId = uuidv4();
    const responseMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
    };
    if (!plugin) {
      homeDispatch({ field: 'loading', value: false });
      const reader = data.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let text = '';

      updatedConversation.messages.push(responseMessage);
      const length = updatedConversation.messages.length;
      while (!done) {
        if (stopConversationRef.current === true) {
          controller.abort();
          done = true;
          break;
        }
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value);
        text += chunkValue;

        updatedConversation.messages[length - 1].content = text;

        homeDispatch({
          field: 'selectedConversation',
          value: updatedConversation,
        });
      }

      updatedConversation.messages.pop();
    } else {
      const { answer } = await response.json();
      responseMessage.content = answer;
    }

    homeDispatch({ field: 'loading', value: false });
    homeDispatch({ field: 'messageIsStreaming', value: false });

    // Saving the response message
    const { single, all } = storageCreateMessage(
      storageType,
      user,
      updatedConversation,
      responseMessage,
      conversations,
    );

    homeDispatch({
      field: 'selectedConversation',
      value: single,
    });

    homeDispatch({ field: 'conversations', value: all });
    saveSelectedConversation(user, single);
  }
};
