// conversaionContext.tsx
import React, { createContext, useContext, useState, useReducer, useEffect } from 'react';
import HomeContext from '@/pages/api/home/home.context';

import type { Conversation, ChatNode } from '@/types/chat';
import {
  switchNode,
  processMessage,
  collectMessagesFromTail,
} from '@/utils/app/chatRoomUtils';

type Actions = {
  clickSwitchNode: (index: number, increment: number) => void;
  // setSelectedConversation: (conversation: Conversation) => void;
  addMessage: (newMessage: ChatNode, index?: number) => void;
  popCurrentMessageList: () => void;
};

interface CurrentUserContextType {
  currentMessageList: ChatNode[];
  // selectedConversation: Conversation | null;
  // setSelectedConversation: (conversation: Conversation) => void;
  modifiedMessage: (updateChatNode: ChatNode) => void;
  actions: Actions;
}

export const ConversationContext = createContext<CurrentUserContextType>({
  currentMessageList: [],
  // selectedConversation: null,
  // setSelectedConversation: () => {},
  modifiedMessage: (updateChatNode: ChatNode) => {},
  actions: {
    clickSwitchNode: (index: number, increment: number) => {},
    // setSelectedConversation: (conversation: Conversation) => {},
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
  // const [selectedConversation, setSelectedConversation] =
  //   useState<Conversation | null>(null);
  const {
    state: {
      selectedConversation,
    },
    // handleUpdateConversation,
    dispatch: homeDispatch,
  } = useContext(HomeContext);

  useEffect(() => {
    setSelectedId(selectedConversation?.id || '');
    if (selectedConversation) {
      setCurrentMessageList(collectMessagesFromTail(selectedConversation));
    }
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
    homeDispatch({
      field: 'selectedConversation',
      value: {
        ...selectedConversation,
        current_node,
      },
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

    homeDispatch({
      field: 'selectedConversation',
      value: {
        ...selectedConversation,
        current_node,
      },
    });
  };

  const modifiedMessage = (updateChatNode: ChatNode) => {
    if (selectedConversation) {
      console.log("@modifiedMessage: update Node", updateChatNode)
      let nodeId = updateChatNode.id;
      let { mapping, ...others } = selectedConversation;
      let updatedConversation: Conversation = {
        ...others,
        mapping: {
          ...mapping,
          [nodeId]: updateChatNode,
        },
      };
      homeDispatch({
        field: 'selectedConversation',
        value: updatedConversation
      });
    }
  };

  const popCurrentMessageList = () => {
    if (selectedConversation) {
      // let updateCurrentMessageList = currentMessageList.slice(0, -1) // currently, I don't know why it cannot work.
      let lastNode = currentMessageList.pop();
      homeDispatch({
        field: 'selectedConversation',
        value: {
          ...selectedConversation,
          current_node: lastNode?.parentMessageId!,
        }
      });
     
      setCurrentMessageList([...currentMessageList]);
    }
  };

  const actions: Actions = {
    clickSwitchNode,
    // setSelectedConversation,
    popCurrentMessageList,
    addMessage,
  };
  const contextValue = {
    currentMessageList,
    selectedConversation,
    // setSelectedConversation,
    modifiedMessage,
    actions,
  };

  return (
    <ConversationContext.Provider value={contextValue}>
      {children}
    </ConversationContext.Provider>
  );
};
