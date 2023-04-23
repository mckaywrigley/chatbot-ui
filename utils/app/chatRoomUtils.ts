import type { ChatNode, Conversation } from '@/types/chat';
import type { ConversationUpdate } from '@/types/conversation';

export const getCurrentUnixTime = (): number => {
  return Math.floor(Date.now() / 1000);
};

export const collectMessagesFromNode = (
  conversation: Conversation,
  startNodeId: string,
): ChatNode[] => {
  const messageList: ChatNode[] = [];
  let currentNode = conversation.mapping[startNodeId];

  while (currentNode.children.length > 0) {
    messageList.push(currentNode);
    currentNode = conversation.mapping[currentNode.children[0]];
  }

  messageList.push(currentNode);
  return messageList;
};

export const collectMessagesFromTail = (
  conversation: Conversation,
): ChatNode[] => {
  const messageList: ChatNode[] = [];
  let currentNode = conversation.mapping[conversation.current_node];
  
  if (!currentNode) return [];
  while (currentNode.parentMessageId) {
    messageList.push(currentNode);
    currentNode = conversation.mapping[currentNode.parentMessageId];
  }

  // ignore system
  if (currentNode.message.role !== 'system') {
    messageList.push(currentNode);
  }

  return messageList.reverse();
};

// click child to switch next or previous
// increment: +1 or -1
// +1: next child
// -1: previouse child
export const switchNode = (
  currentMessageList: ChatNode[],
  index: number,
  increment: number,
  conversation: Conversation,
): ConversationUpdate => {
  const childNode = currentMessageList[index];
  const parentId = childNode.parentMessageId;
  let nextChildId = '';

  if (parentId) {
    const parentNode = conversation.mapping[parentId];
    const childIndex = parentNode.children.indexOf(childNode.id);
    nextChildId = parentNode.children[childIndex + increment];

    if (nextChildId) {
      const newMessageList = collectMessagesFromNode(conversation, nextChildId);
      currentMessageList.splice(index);
      currentMessageList.push(...newMessageList);
    }
  }
  return {
    messageList: currentMessageList,
    current_node: nextChildId
      ? currentMessageList[currentMessageList.length - 1].id
      : conversation.current_node,
  };
};

export const processMessage = (
  currentMessageList: ChatNode[],
  conversation: Conversation,
  message: ChatNode,
  index?: number,
): ConversationUpdate => {
  const { parentMessageId } = message;
  if (parentMessageId) {
    const parentNode = conversation.mapping[parentMessageId];

    parentNode.children.push(message.id);
    conversation.mapping[message.id] = message;

    if (index !== undefined) {
      currentMessageList.splice(index);
    }

    // replace the old messages with the other messages from next child
    currentMessageList.push(message);
    conversation.current_node = message.id;
  }
  return {
    messageList: currentMessageList,
    current_node: message.id,
  };
};
