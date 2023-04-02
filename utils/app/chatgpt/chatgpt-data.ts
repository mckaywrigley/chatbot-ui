import { Conversation, Message } from '@/types/chat';
import { LatestExportFormat } from '@/types/export';
import { OpenAIModel, OpenAIModelID, OpenAIModels } from '@/types/openai';

export type InterceptedChatGPTFileFormat = InterceptedChatGPTConversation[];

export interface InterceptedChatGPTConversation {
  type: 'fetch' | 'xhr';
  url: string;
  response: ChatGPTConversation;
}

export interface ChatGPTConversation {
  title: string;
  create_time: number;
  update_time: number;
  mapping: Record<string, ChatGPTConversationNode>;
  moderation_results: any[];
  current_node: string;
}

export interface ChatGPTConversationNode {
  id: string;
  message?: ChatGPTMessage;
  parent?: string;
  children?: string[];
}

export interface ChatGPTMessage {
  id: string;
  author: ChatGPTMessageAuthor;
  create_time: number;
  content: ChatGPTMessageContent;
  end_turn?: boolean;
  weight: number;
  metadata?: ChatGPTMessageMetdata;
  recipient: string;
}

export interface ChatGPTMessageMetdata {
  model_slug?: string;
  finish_details?: {
    type: string;
    stop: string;
  };
  timestamp_?: 'absolute';
  [key: string]: any;
}

export interface ChatGPTMessageAuthor {
  role: string;
  metadata: Record<string, any>;
}

export interface ChatGPTMessageContent {
  content_type: string;
  parts: string[];
}

export function isChatGPTDataFormat(
  obj: any,
): obj is InterceptedChatGPTFileFormat {
  if (!Array.isArray(obj) || !obj.length) {
    return false;
  }
  const first = obj[0];
  return !('version' in first) && 'response' in first && 'url' in first;
}

export function convertChatGPTDataToNativeFormat(
  data: InterceptedChatGPTFileFormat,
): LatestExportFormat {
  const history: Conversation[] = [];
  for (const intercepted of data) {
    const response = intercepted.response;

    /* ----------------------------- Gather messages ---------------------------- */
    const messages: Message[] = [];
    const nodes = Object.values(response.mapping).filter((node) => {
      return node.message;
    });
    // sort nodes (and thus messages) ascending by create_time
    nodes.sort((a, b) => {
      if (!a.message) {
        return -1;
      }
      if (!b.message) {
        return 1;
      }
      return a.message?.create_time - b.message?.create_time;
    });

    for (const node of nodes) {
      if (node.message) {
        const content = node.message.content.parts.join(' ');
        if (!content) {
          continue;
        }
        messages.push({
          role: node.message.author.role as any,
          content: content,
        });
      }
    }

    // If there are no messages, skip this conversation
    if (!messages.length) {
      continue;
    }

    // For our purposes, the id of the first message will be the id of the conversation.
    const nodesWithModel = nodes.filter((node) => {
      return !!node.message?.metadata?.model_slug;
    });
    const modelSlug = nodesWithModel[0]?.message?.metadata?.model_slug;

    // model_slug options (as of April 2nd, 2023):
    // text-davinci-002-render-sha
    // gpt-4

    const newConversation: Conversation = {
      id: `chat-gpt-${nodes[0].id}`,
      name: response.title,
      messages,
      model: modelSlug?.includes(`gpt-4`)
        ? OpenAIModels[OpenAIModelID.GPT_4]
        : OpenAIModels[OpenAIModelID.GPT_3_5],
      prompt: '',
      folderId: null,
    };
    history.push(newConversation);
  }

  // There are no folders or prompts from ChatGPT data
  const cleanedData: LatestExportFormat = {
    version: 4,
    history: history,
    folders: [],
    prompts: [],
  };

  return cleanedData;
}
