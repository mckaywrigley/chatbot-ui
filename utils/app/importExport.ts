import { Conversation } from '@/types/chat';
import {
  ConversationV1,
  ConversationV4,
  ConversationV5,
  ExportFormatsV2AndUp,
  ExportFormatV1,
  ExportFormatV2,
  ExportFormatV3,
  ExportFormatV4,
  ExportFormatV5,
  LatestExportFormat,
  SupportedExportFormats,
} from '@/types/export';

import {
  cleanHistoryItem,
  convertV1HistoryToV2History,
  convertV1ToV2,
  convertV2ToV3,
  convertV3ToV4,
  convertV4ToV5,
  isHistoryFormatV1,
} from './clean';

import { FolderInterface } from '@/types/folder';
import { Prompt } from '@/types/prompt';

import { cleanConversationHistory } from './clean';


export function isExportFormatV1(obj: any): obj is ExportFormatV1 {
  return Array.isArray(obj);
}

export function isExportFormatV2(obj: any): obj is ExportFormatV2 {
  return !('version' in obj) && 'folders' in obj && 'history' in obj;
}

export function isExportFormatV3(obj: any): obj is ExportFormatV3 {
  return obj.version === 3;
}

export function isExportFormatV4(obj: any): obj is ExportFormatV4 {
  return obj.version === 4;
}

export function isExportFormatV5(obj: any): obj is ExportFormatV5 {
  return obj.version === 5;
}

export const isLatestExportFormat = isExportFormatV5;

export function cleanData(data: SupportedExportFormats): LatestExportFormat {
  let originalDataFormat: string | null = null;

  const convertData = (
    versionNumber: string,
    isData: (obj: any) => boolean,
    convertData?: (obj: any) => any,
  ) => {
    if (isData(data)) {
      if (!originalDataFormat) {
        originalDataFormat = versionNumber;
      }
      if (convertData) {
        data = convertData(data);
      }
    }
  };

  // Convert data between formats
  convertData('1', isExportFormatV1, convertV1ToV2);
  convertData('2', isExportFormatV2, convertV2ToV3);
  convertData('3', isExportFormatV3, convertV3ToV4);
  convertData('4', isExportFormatV4, convertV4ToV5);
  convertData('5', isExportFormatV5);

  if (!originalDataFormat) {
    throw new Error('Unsupported data format');
  } else {
    return data as LatestExportFormat;
  }

  // if (isExportFormatV2(data)) {
  //   return {
  //     version: 4,
  //     history: cleanConversationHistory(data.history || []),
  //     folders: (data.folders || []).map((chatFolder) => ({
  //       id: chatFolder.id.toString(),
  //       name: chatFolder.name,
  //       type: 'chat',
  //     })),
  //     prompts: [],
  //   };
  // }

  // if (isExportFormatV3(data)) {
  //   return { ...data, version: 4, prompts: [] };
  // }

  // if (isExportFormatV4(data)) {
  //   return data;
  // }

  // throw new Error('Unsupported data format');
// >>>>>>> upstream/main
}

function currentDate() {
  const date = new Date();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}-${day}`;
}

export const exportData = () => {
  let history = localStorage.getItem('conversationHistory');
  let folders = localStorage.getItem('folders');
  let prompts = localStorage.getItem('prompts');

  if (history) {
    history = JSON.parse(history);
  }

  if (folders) {
    folders = JSON.parse(folders);
  }

  if (prompts) {
    prompts = JSON.parse(prompts);
  }

  const data = {
    version: 5,
    history: history || [],
    folders: folders || [],
    prompts: prompts || [],
  } as LatestExportFormat;

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = `chatbot_ui_history_${currentDate()}.json`;
  link.href = url;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const importData = (
  data: SupportedExportFormats,
): LatestExportFormat => {
  const cleanedData = cleanData(data);
  const { history, folders, prompts } = cleanedData;
  // const { history, folders, prompts } = cleanData(data);

  const oldConversations = localStorage.getItem('conversationHistory');
  const oldConversationsParsed = oldConversations
    ? JSON.parse(oldConversations)
    : [];

  const newHistory: Conversation[] = [
    ...oldConversationsParsed,
    ...history,
  ].filter(
    (conversation, index, self) =>
      index === self.findIndex((c) => c.id === conversation.id),
  );
  localStorage.setItem('conversationHistory', JSON.stringify(newHistory));
  if (newHistory.length > 0) {
    localStorage.setItem(
      'selectedConversation',
      JSON.stringify(newHistory[newHistory.length - 1]),
    );
  } else {
    localStorage.removeItem('selectedConversation');
  }

  const oldFolders = localStorage.getItem('folders');
  const oldFoldersParsed = oldFolders ? JSON.parse(oldFolders) : [];
  const newFolders: FolderInterface[] = [
    ...oldFoldersParsed,
    ...folders,
  ].filter(
    (folder, index, self) =>
      index === self.findIndex((f) => f.id === folder.id),
  );
  localStorage.setItem('folders', JSON.stringify(newFolders));

  const oldPrompts = localStorage.getItem('prompts');
  const oldPromptsParsed = oldPrompts ? JSON.parse(oldPrompts) : [];
  const newPrompts: Prompt[] = [...oldPromptsParsed, ...prompts].filter(
    (prompt, index, self) =>
      index === self.findIndex((p) => p.id === prompt.id),
  );
  localStorage.setItem('prompts', JSON.stringify(newPrompts));

  return cleanedData
};
