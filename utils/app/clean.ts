import {
  ChatNode,
  Conversation,
  Message,
  SupportedConversationFormats,
} from '@/types/chat';
import {
  ConversationV1,
  ConversationV4,
  ConversationV5,
  ExportFormatV1,
  ExportFormatV2,
  ExportFormatV3,
  ExportFormatV4,
  ExportFormatV5,
} from '@/types/export';
import { OpenAIModelID, OpenAIModels } from '@/types/openai';
import { DEFAULT_SYSTEM_PROMPT } from './const';

export const cleanSelectedConversation = (conversation: Conversation) => {
  // added model for each conversation (3/20/23)
  // added system prompt for each conversation (3/21/23)
  // added folders (3/23/23)
  // added prompts (3/26/23)

  let updatedConversation = conversation;

  // check for model on each conversation
  if (!updatedConversation.model) {
    updatedConversation = {
      ...updatedConversation,
      model: updatedConversation.model || OpenAIModels[OpenAIModelID.GPT_3_5],
    };
  }

  // check for system prompt on each conversation
  if (!updatedConversation.prompt) {
    updatedConversation = {
      ...updatedConversation,
      prompt: updatedConversation.prompt || DEFAULT_SYSTEM_PROMPT,
    };
  }

  if (!updatedConversation.folderId) {
    updatedConversation = {
      ...updatedConversation,
      folderId: updatedConversation.folderId || null,
    };
  }

  return updatedConversation;
};

export const isHistoryFormatV1 = (
  historyItem: any,
): historyItem is ConversationV1 => {
  if (!historyItem) {
    return false;
  }
  return (
    !('model' in historyItem) ||
    !('prompt' in historyItem) ||
    !('folderId' in historyItem)
  );
};

export const isHistoryFormatV4 = (
  historyItem: any,
): historyItem is ConversationV4 => {
  if (!historyItem) {
    return false;
  }
  return (
    'model' in historyItem &&
    'prompt' in historyItem &&
    'messages' in historyItem
  );
};

export const isHistoryFormatV5 = (
  historyItem: any,
): historyItem is ConversationV5 => {
  if (!historyItem) {
    return false;
  }
  return 'mapping' in historyItem && 'current_node' in historyItem;
};

export const convertV1HistoryToV2History = (
  historyItem: ConversationV1 | ConversationV4,
): ConversationV4 => {
  const result = {
    ...historyItem,
    id: historyItem.id.toString(),
    folderId: 'folderId' in historyItem ? historyItem.folderId : null,
    prompt:
      'prompt' in historyItem ? historyItem.prompt : DEFAULT_SYSTEM_PROMPT,
    model:
      'model' in historyItem
        ? historyItem.model
        : OpenAIModels[OpenAIModelID.GPT_3_5],
  } as ConversationV4;

  return result;
};

export const getChatNodeIdFromMessage = (messageIndex: number) => {
  return `${messageIndex.toString()}`;
};

export const convertV4HistoryToV5History = (
  historyItem: ConversationV4,
): Conversation => {
  if (isHistoryFormatV1(historyItem)) {
    historyItem = convertV1HistoryToV2History(historyItem);
  }

  // Convert each message into a ChatNode
  const chatNodes = historyItem.messages.map((message, index) => {
    const id = getChatNodeIdFromMessage(index);
    return {
      id: id,
      message: message,
      parentMessageId: undefined,
      children: [],
    } as ChatNode;
  });

  // Hook up parents / children
  chatNodes.forEach((node, index) => {
    const previousNode = index === 0 ? null : chatNodes[index - 1];
    const nextNode =
      index === chatNodes.length - 1 ? null : chatNodes[index + 1];
    node.parentMessageId = previousNode?.id;
    node.children = nextNode ? [nextNode.id] : [];
  });

  const result = {
    ...historyItem,
    mapping: chatNodes.reduce((acc, node) => {
      acc[node.id] = node;
      return acc;
    }, {} as Record<string, ChatNode>),
    current_node: chatNodes[chatNodes.length - 1].id,
  } as Conversation;
  delete result['messages' as keyof Conversation];
  return result;
};

export const convertV1ToV2 = (obj: ExportFormatV1): ExportFormatV2 => {
  return {
    folders: [],
    history: obj.map(convertV1HistoryToV2History),
  };
};

export const convertV2ToV3 = (obj: ExportFormatV2): ExportFormatV3 => {
  return {
    version: 3,
    folders: (obj.folders || []).map((folder) => {
      return {
        ...folder,
        id: folder.id.toString(),
        type: 'chat',
      };
    }),
    history: obj.history ?? [],
  };
};

export const convertV3ToV4 = (obj: ExportFormatV3): ExportFormatV4 => {
  return {
    ...obj,
    version: 4,
    prompts: [],
  };
};

export const convertV4ToV5 = (obj: ExportFormatV4): ExportFormatV5 => {
  return {
    ...obj,
    version: 5,
    history: obj.history.map(convertV4HistoryToV5History),
  };
};

export const cleanHistoryItem = (
  conversation: SupportedConversationFormats,
): Conversation | null => {
  try {
    if (isHistoryFormatV1(conversation)) {
      conversation = convertV1HistoryToV2History(conversation);
    }

    if (isHistoryFormatV4(conversation)) {
      conversation = convertV4HistoryToV5History(conversation);
    }
    return conversation;
  } catch (error) {
    console.warn(
      `error while cleaning conversations' history. Removing culprit`,
      error,
    );
    return null;
  }
};

export const cleanConversationHistory = (history: any[]): Conversation[] => {
  // added model for each conversation (3/20/23)
  // added system prompt for each conversation (3/21/23)
  // added folders (3/23/23)
  // added prompts (3/26/23)

  if (!Array.isArray(history)) {
    console.warn('history is not an array. Returning an empty array.');
    return [];
  }

  return history.reduce(
    (acc: any[], conversation: SupportedConversationFormats) => {
      try {
        const conversationMaybe = cleanHistoryItem(conversation);
        if (conversationMaybe) {
          acc.push(conversationMaybe);
        }

        return acc;
      } catch (error) {}
      return acc;
    },
    [],
  );
};
