import { Dispatch } from 'react';

import { ActionType } from '@/hooks/useCreateReducer';

import { Conversation, Message } from '@/types/chat';

import { HomeInitialState } from '@/pages/api/home/home.state';

export class HomeUpdater {
  constructor(
    private readonly dispatch: Dispatch<ActionType<HomeInitialState>>,
  ) {}

  addMessage(conversation: Conversation, message: Message): Conversation {
    const updatedMessages: Message[] = [...conversation.messages, message];
    conversation = {
      ...conversation,
      messages: updatedMessages,
    };
    this.dispatch({
      field: 'selectedConversation',
      value: conversation,
    });
    return conversation;
  }

  appendChunkToLastMessage(
    conversation: Conversation,
    chunk: string,
  ): Conversation {
    const lastIndex = conversation.messages.length - 1;
    const lastMessage = conversation.messages[lastIndex];
    const messages = [
      ...conversation.messages.slice(0, lastIndex - 1),
      lastMessage,
    ];
    conversation = {
      ...conversation,
      messages: messages,
    };
    this.dispatch({
      field: 'selectedConversation',
      value: conversation,
    });
    return conversation;
  }
}
