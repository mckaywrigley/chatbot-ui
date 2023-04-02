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
  role: string | 'tool' | 'assistant' | 'user' | 'system';
  /**
   * The name of the tool used if role is 'tool'
   */
  name?: string;
  metadata: Record<string, any>;
}

export interface ChatGPTMessageContent {
  content_type:
    | string
    | 'tether_browsing_display'
    | 'code'
    | 'text'
    | 'tether_quote';

  text?: string;

  /**
   * Used when content_type is 'text'
   */
  parts?: string[];

  /**
   * Used when content_type is 'code'
   */
  language?: string;
  /**
   * Used when content_type is 'tether_browsing_display'
   */
  result?: string;
  /**
   * Used when content_type is 'tether_browsing_display'
   */
  summary?: string;

  /**
   * Used when content_type is 'tether_quote'
   */
  url?: string;
  /**
   * Used when content_type is 'tether_quote'
   */
  domain?: string;
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
      const messageContent = node.message?.content;
      if (node.message && messageContent) {
        let contentPieces: string[] = [];

        if (messageContent.parts?.length) {
          contentPieces = [...contentPieces, ...messageContent.parts];
        }
        if (messageContent.text?.length) {
          contentPieces = [...contentPieces, messageContent.text];
        }
        if (messageContent.result?.length) {
          contentPieces = [...contentPieces, messageContent.result];
        }
        if (messageContent.summary?.length) {
          contentPieces = [...contentPieces, messageContent.summary];
        }
        if (messageContent.url?.length) {
          contentPieces = [...contentPieces, `[${messageContent.url}]`];
        }
        const content = contentPieces
          .filter((piece) => {
            return !!piece.length;
          })
          .join('\n');

        if (!content) {
          continue;
        }
        const author = node.message.author;
        const role = `${author.role}${author.name ? ` (${author.name})` : ''}`;
        messages.push({
          role: role as any,
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
