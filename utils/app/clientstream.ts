import { Dispatch, MutableRefObject } from 'react';

import { ActionType } from '@/hooks/useCreateReducer';

import { Conversation, Message } from '@/types/chat';

import { HomeInitialState } from '@/pages/api/home/home.state';

export const updateConversationFromStream = async (
  stream: ReadableStream<Uint8Array>,
  controller: AbortController,
  homeDispatch: Dispatch<ActionType<HomeInitialState>>,
  updatedConversation: Conversation,
  stopConversationRef: MutableRefObject<boolean>,
): Promise<Conversation> => {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let done = false;
  let isFirst = true;
  let text = '';
  while (!done) {
    if (stopConversationRef.current === true) {
      stopConversationRef.current = false;
      controller.abort();
      done = true;
      break;
    }
    const { value, done: doneReading } = await reader.read();
    done = doneReading;
    const chunkValue = decoder.decode(value);
    text += chunkValue;
    if (isFirst) {
      isFirst = false;
      const updatedMessages: Message[] = [
        ...updatedConversation.messages,
        { role: 'assistant', content: chunkValue },
      ];
      updatedConversation = {
        ...updatedConversation,
        messages: updatedMessages,
      };
      homeDispatch({
        field: 'selectedConversation',
        value: updatedConversation,
      });
    } else {
      const updatedMessages: Message[] = updatedConversation.messages.map(
        (message, index) => {
          if (index === updatedConversation.messages.length - 1) {
            return {
              ...message,
              content: text,
            };
          }
          return message;
        },
      );
      updatedConversation = {
        ...updatedConversation,
        messages: updatedMessages,
      };
      homeDispatch({
        field: 'selectedConversation',
        value: updatedConversation,
      });
    }
  }
  return updatedConversation;
};
