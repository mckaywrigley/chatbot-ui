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
  convertChatGPTDataToNativeFormat,
  isChatGPTDataFormat,
} from './chatgpt/chatgpt-data';
import {
  cleanConversationHistory,
  cleanHistoryItem,
  convertV1HistoryToV2History,
  convertV1ToV2,
  convertV2ToV3,
  convertV3ToV4,
  convertV4ToV5,
  isHistoryFormatV1,
} from './clean';

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
  if (isChatGPTDataFormat(data)) {
    const converted = convertChatGPTDataToNativeFormat(data);
    return converted;
  }

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
}

function currentDate() {
  const date = new Date();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}-${day}`;
}

export const getCurrentData = () => {
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

  return data;
};

export const exportData = () => {
  const data = getCurrentData();
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

/**
 * Merges two export formats together and returns the result. Items are deduplicated by ID.
 * @param data1
 * @param data2
 * @returns
 */
export const mergeData = (data1: ExportFormatV5, data2: ExportFormatV5) => {
  const mergeListsById = <T extends { id: string }>(
    list1: T[],
    list2: T[],
  ): T[] => {
    const mergedList: T[] = [];
    const existingIds = new Set();

    [...list1, ...list2].forEach((item) => {
      if (!existingIds.has(item.id)) {
        existingIds.add(item.id);
        mergedList.push(item);
      }
    });

    return mergedList;
  };

  const merged = {
    ...data1,
    history: mergeListsById(data1.history, data2.history),
    folders: mergeListsById(data1.folders, data2.folders),
    prompts: mergeListsById(data1.prompts, data2.prompts),
  };
  return merged;
};

export const importData = (
  data: SupportedExportFormats,
): LatestExportFormat => {
  const currentData = getCurrentData();

  const cleanedData = cleanData(data);
  const mergedData = mergeData(currentData, cleanedData);
  const { history, folders, prompts } = mergedData;

  const conversations = history;
  localStorage.setItem('conversationHistory', JSON.stringify(conversations));
  localStorage.setItem(
    'selectedConversation',
    JSON.stringify(conversations[conversations.length - 1]),
  );

  localStorage.setItem('folders', JSON.stringify(folders));
  localStorage.setItem('prompts', JSON.stringify(prompts));

  return mergedData;
};
