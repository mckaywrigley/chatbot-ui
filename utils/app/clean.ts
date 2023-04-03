import { ChatNode, Conversation } from '@/types/chat';
import {
  ConversationV1,
  ConversationV4,
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
  return !('model' in historyItem) && !('prompt' in historyItem);
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

export const convertV1HistoryToV2History = (
  historyItem: ConversationV1,
): ConversationV4 => {
  return {
    ...historyItem,
    id: historyItem.id.toString(),
    folderId: null,
    prompt: DEFAULT_SYSTEM_PROMPT,
    model: OpenAIModels[OpenAIModelID.GPT_3_5],
  } as ConversationV4;
};

export const convertV4HistoryToV5History = (
  historyItem: ConversationV4,
): Conversation => {
  // Convert each message into a ChatNode
  const chatNodes = historyItem.messages.map((message, index) => {
    const id = index.toString();

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

  return {
    ...historyItem,
    mapping: chatNodes.reduce((acc, node) => {
      acc[node.id] = node;
      return acc;
    }, {} as Record<string, ChatNode>),
    current_node: chatNodes[chatNodes.length - 1].id,
  } as Conversation;
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

export const cleanConversationHistory = (history: any[]): Conversation[] => {
  // added model for each conversation (3/20/23)
  // added system prompt for each conversation (3/21/23)
  // added folders (3/23/23)
  // added prompts (3/26/23)

  if (!Array.isArray(history)) {
    console.warn('history is not an array. Returning an empty array.');
    return [];
  }

  return history.reduce((acc: any[], conversation) => {
    try {
      if (isHistoryFormatV1(conversation)) {
        conversation = convertV1HistoryToV2History(conversation);
      }
      if (isHistoryFormatV4(conversation)) {
        conversation = convertV4HistoryToV5History(conversation);
      }

      acc.push(conversation);
      return acc;
    } catch (error) {
      console.warn(
        `error while cleaning conversations' history. Removing culprit`,
        error,
      );
    }
    return acc;
  }, []);
};
