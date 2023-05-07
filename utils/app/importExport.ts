import {
  ExportFormatV1,
  ExportFormatV2,
  ExportFormatV3,
  ExportFormatV4,
  LatestExportFormat,
  SupportedExportFormats,
} from '@/types/export';
import { User } from 'chatbot-ui-core/types/auth';
import { Conversation } from 'chatbot-ui-core/types/chat';
import { FolderInterface } from 'chatbot-ui-core/types/folder';
import { Prompt } from 'chatbot-ui-core/types/prompt';

import { cleanConversationHistory } from './clean';
import {
  storageGetConversations,
  storageUpdateConversations,
} from './storage/conversations';
import { storageGetFolders, storageUpdateFolders } from './storage/folders';
import { storageCreateMessages } from './storage/messages';
import { storageGetPrompts, storageUpdatePrompts } from './storage/prompts';
import { saveSelectedConversation } from './storage/selectedConversation';
import { deleteSelectedConversation } from './storage/selectedConversation';

import { Database } from 'chatbot-ui-core';

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

export const isLatestExportFormat = isExportFormatV4;

export function cleanData(data: SupportedExportFormats): LatestExportFormat {
  if (isExportFormatV1(data)) {
    return {
      version: 4,
      history: cleanConversationHistory(data),
      folders: [],
      prompts: [],
    };
  }

  if (isExportFormatV2(data)) {
    return {
      version: 4,
      history: cleanConversationHistory(data.history || []),
      folders: (data.folders || []).map((chatFolder) => ({
        id: chatFolder.id.toString(),
        name: chatFolder.name,
        type: 'chat',
      })),
      prompts: [],
    };
  }

  if (isExportFormatV3(data)) {
    return { ...data, version: 4, prompts: [] };
  }

  if (isExportFormatV4(data)) {
    return data;
  }

  throw new Error('Unsupported data format');
}

function currentDate() {
  const date = new Date();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}-${day}`;
}

export const exportData = async (database: Database, user: User) => {
  let history = await storageGetConversations(database, user);
  let folders = await storageGetFolders(database, user);
  let prompts = await storageGetPrompts(database, user);

  const data = {
    version: 4,
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

export const importData = async (
  database: Database,
  user: User,
  data: SupportedExportFormats,
): Promise<LatestExportFormat> => {
  const { history, folders, prompts } = cleanData(data);

  // Updating folders
  const oldFolders = await storageGetFolders(database, user);
  const newFolders: FolderInterface[] = [...oldFolders, ...folders].filter(
    (folder, index, self) =>
      index === self.findIndex((f) => f.id === folder.id),
  );

  await storageUpdateFolders(database, user, newFolders);

  // Updating conversations
  const oldConversations = await storageGetConversations(database, user);
  const newHistory: Conversation[] = [...oldConversations, ...history].filter(
    (conversation, index, self) =>
      index === self.findIndex((c) => c.id === conversation.id),
  );

  await storageUpdateConversations(database, user, newHistory);

  if (database.name === 'RDBMS') {
    for (const conversation of history) {
      if (conversation.messages.length > 0) {
        storageCreateMessages(
          database,
          user,
          conversation,
          conversation.messages,
          newHistory,
        );
      }
    }
  }
  if (newHistory.length > 0) {
    saveSelectedConversation(user, newHistory[newHistory.length - 1]);
  } else {
    deleteSelectedConversation(user);
  }

  // Updating prompts
  const oldPrompts = await storageGetPrompts(database, user);
  const newPrompts: Prompt[] = [...oldPrompts, ...prompts].filter(
    (prompt, index, self) =>
      index === self.findIndex((p) => p.id === prompt.id),
  );

  storageUpdatePrompts(database, user, prompts);

  return {
    version: 4,
    history: newHistory,
    folders: newFolders,
    prompts: newPrompts,
  };
};
