import { Conversation, Message } from './chat';
import { FolderInterface } from './folder';
import { OpenAIModel } from './openai';
import { Prompt } from './prompt';

export type SupportedExportFormats =
  | ExportFormatV1
  | ExportFormatV2
  | ExportFormatV3
  | ExportFormatV4;
export type LatestExportFormat = ExportFormatV4;

////////////////////////////////////////////////////////////////////////////////////////////
interface ConversationV1 {
  id: number;
  name: string;
  messages: Message[];
}

export type ExportFormatV1 = ConversationV1[];

////////////////////////////////////////////////////////////////////////////////////////////
interface ChatFolder {
  id: number;
  name: string;
}

export interface ExportFormatV2 {
  history: Conversation[] | null;
  folders: ChatFolder[] | null;
}

////////////////////////////////////////////////////////////////////////////////////////////
export interface ExportFormatV3 {
  version: 3;
  history: Conversation[];
  folders: FolderInterface[];
}

export interface ExportFormatV4 {
  version: 4;
  history: Conversation[];
  folders: FolderInterface[];
  prompts: Prompt[];
}
