// conversaionContext.tsx
import React, { createContext, useState, useCallback, useEffect } from 'react';
import type { Conversation, ChatNode } from '@/types/chat';
import {
  switchNode,
  processMessage,
  collectMessagesFromTail,
} from '@/utils/app/chatRoomUtils';

type Actions = {
  clickSwitchNode: (index: number, increment: number) => void;
  setSelectedConversation: (conversation: Conversation) => void;
  addMessage: (newMessage: ChatNode, index?: number) => void;
  popCurrentMessageList: () => void;
};

interface CurrentUserContextType {
  currentMessageList: ChatNode[];
  selectedConversation: Conversation | null;
  setSelectedConversation: (conversation: Conversation) => void;
  actions: Actions;
}

export const ConversationContext = createContext<CurrentUserContextType>({
  currentMessageList: [],
  selectedConversation: null,
  setSelectedConversation: () => {},
  actions: {
    clickSwitchNode: (index: number, increment: number) => {},
    setSelectedConversation: (conversation: Conversation) => {},
    addMessage: (newMessage: ChatNode, index?: number) => {},
    popCurrentMessageList: () => {},
  },
});

// https://stackoverflow.com/questions/59106742/typescript-error-property-children-does-not-exist-on-type-reactnode
interface Props {
  children: React.ReactNode;
}

export const ConversationProvider: React.FC<Props> = ({ children }) => {
  const [currentMessageList, setCurrentMessageList] = useState<ChatNode[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);

  useEffect(() => {
    setSelectedId(selectedConversation?.id || '');
  }, [selectedConversation]);

  useEffect(() => {
    if (selectedConversation) {
      setCurrentMessageList(collectMessagesFromTail(selectedConversation));
    }
  }, [selectedId]);

  const clickSwitchNode = (index: number, increment: number) => {
    if (!selectedConversation) return;
    const { messageList, current_node } = switchNode(
      currentMessageList,
      index,
      increment,
      selectedConversation,
    );
    setCurrentMessageList([...messageList]);
    setSelectedConversation({
      ...selectedConversation,
      current_node,
    });
  };

  const addMessage = (newMessage: ChatNode, index?: number) => {
    if (!selectedConversation) return;
    const { messageList, current_node } = processMessage(
      currentMessageList,
      selectedConversation,
      newMessage,
      index,
    );

    setSelectedConversation({
      ...selectedConversation!,
      current_node,
    });
    setCurrentMessageList([...messageList]);
  };

  const popCurrentMessageList = () => {
    if (selectedConversation) {
      // let updateCurrentMessageList = currentMessageList.slice(0, -1) // currently, I don't know why it cannot work.
      let lastNode = currentMessageList.pop();

      setSelectedConversation({
        ...selectedConversation,
        current_node: lastNode?.parentMessageId!,
      });
      setCurrentMessageList([...currentMessageList]);
    }
  };

  const actions: Actions = {
    clickSwitchNode,
    setSelectedConversation,
    popCurrentMessageList,
    addMessage,
  };
  const contextValue = {
    currentMessageList,
    selectedConversation,
    setSelectedConversation,
    actions,
  };

  return (
    <ConversationContext.Provider value={contextValue}>
      {children}
    </ConversationContext.Provider>
  );
};
