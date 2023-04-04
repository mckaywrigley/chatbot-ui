import { Conversation, Message, Role } from './chat';
import { Folder } from './folder';
import { OpenAIModel } from './openai';
import { Prompt } from './prompt';

export type ExportFormatsV2AndUp =
  | ExportFormatV2
  | ExportFormatV3
  | ExportFormatV4
  | ExportFormatV5;
export type SupportedExportFormats = ExportFormatV1 | ExportFormatsV2AndUp;

export type LatestExportFormat = ExportFormatV5;

////////////////////////////////////////////////////////////////////////////////////////////

export interface MessageV4 {
  role: Role;
  content: string;
}
export type MessageV5 = Message;

export interface ConversationV1 {
  id: number;
  name: string;
  messages: MessageV4[];
}

export interface ConversationV4 {
  id: string;
  name: string;
  messages: MessageV4[];
  model: OpenAIModel;
  prompt: string;
  folderId: string | null;
}

export type ConversationV5 = Conversation;

export type ExportFormatV1 = ConversationV1[];

////////////////////////////////////////////////////////////////////////////////////////////
interface FolderV2 {
  id: number;
  name: string;
}

export interface ExportFormatV2 {
  history: ConversationV4[] | null;
  folders: FolderV2[] | null;
}

////////////////////////////////////////////////////////////////////////////////////////////
export interface ExportFormatV3 {
  version: 3;
  history: ConversationV4[];
  folders: Folder[];
}

export interface ExportFormatV4 {
  version: 4;
  history: ConversationV4[];
  folders: Folder[];
  prompts: Prompt[];
}

export interface ExportFormatV5 {
  version: 5;
  history: Conversation[];
  folders: Folder[];
  prompts: Prompt[];
}
