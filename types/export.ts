import { Conversation, Message } from './chat';
import { Folder } from './folder';
import { OpenAIModel } from './openai';

export type SupportedExportFormats =
  | ExportFormatV1
  | ExportFormatV2
  | ExportFormatV3;
export type LatestExportFormat = ExportFormatV3;

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
  folders: Folder[];
}
