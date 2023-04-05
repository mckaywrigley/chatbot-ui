import { ChatNode, Conversation, Message } from '@/types/chat';
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

    const chatgptNodes = Object.values(response.mapping);
    const newNodes: Record<string, ChatNode> = {};
    for (const id in response.mapping) {
      const node = response.mapping[id];

      let message: Message | undefined = undefined;
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
        message = {
          id: node.message.id,
          role: role as any,
          content: content,
          create_time: node.message.create_time,
        };
      }
      if (!message) {
        continue;
      }
      const newNode: ChatNode = {
        id: node.id,
        children: node.children || [],
        parentMessageId: node.parent || undefined,
        message: message,
      };
      newNodes[node.id] = newNode;
    }

    // For our purposes, the id of the first message will be the id of the conversation.
    const nodesWithModel = chatgptNodes.filter((node) => {
      return !!node.message?.metadata?.model_slug;
    });
    const modelSlug = nodesWithModel[0]?.message?.metadata?.model_slug;

    // model_slug options (as of April 2nd, 2023):
    // text-davinci-002-render-sha
    // gpt-4

    const newConversation: Conversation = {
      id: `chat-gpt-${chatgptNodes[0].id}`,
      name: response.title,
      mapping: newNodes,
      model: modelSlug?.includes(`gpt-4`)
        ? OpenAIModels[OpenAIModelID.GPT_4]
        : OpenAIModels[OpenAIModelID.GPT_3_5],
      prompt: '',
      folderId: null,
      create_time: response.create_time,
      update_time: response.update_time,
      current_node: response.current_node,
    };
    history.push(newConversation);
  }

  // There are no folders or prompts from ChatGPT data
  const cleanedData: LatestExportFormat = {
    version: 5,
    history: history,
    folders: [],
    prompts: [],
  };

  return cleanedData;
}
