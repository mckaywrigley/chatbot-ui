import {
  ExportFormatV1,
  ExportFormatV2,
  ExportFormatV3,
  ExportFormatV4,
  LatestExportFormat,
} from '@/types/export';
import { OpenAIModels, OpenAIModelID } from '@/types/openai';
import { DEFAULT_SYSTEM_PROMPT } from '@/utils/app/const';
import { it, describe, expect } from 'vitest';
import chatgptDataSample from './chatgpt-data-sample.json';
import cleanedChatgptDataSample from './cleaned-chatgpt-data-sample.json';

import {
  cleanData,
  isExportFormatV1,
  isExportFormatV2,
  isExportFormatV3,
  isExportFormatV4,
  isExportFormatV5,
  isLatestExportFormat,
  mergeData,
} from '@/utils/app/importExport';
import {
  convertChatGPTDataToNativeFormat,
  isChatGPTDataFormat,
} from '@/utils/app/chatgpt/chatgpt-data';
import type { InterceptedChatGPTFileFormat } from '@/utils/app/chatgpt/chatgpt-data';
import { Conversation, ChatNode } from '@/types/chat';
import { getChatNodeIdFromMessage } from '@/utils/app/clean';
import { getCurrentUnixTime } from '@/utils/app/chatRoomUtils';

describe('Export Format Functions', () => {
  describe('isExportFormatV1', () => {
    it('should return true for v1 format', () => {
      const obj = [{ id: 1 }];
      expect(isExportFormatV1(obj)).toBe(true);
    });

    it('should return false for non-v1 formats', () => {
      const obj = { version: 3, history: [], folders: [] };
      expect(isExportFormatV1(obj)).toBe(false);
    });
  });

  describe('isExportFormatV2', () => {
    it('should return true for v2 format', () => {
      const obj = { history: [], folders: [] };
      expect(isExportFormatV2(obj)).toBe(true);
    });

    it('should return false for non-v2 formats', () => {
      const obj = { version: 3, history: [], folders: [] };
      expect(isExportFormatV2(obj)).toBe(false);
    });
  });

  describe('isExportFormatV3', () => {
    it('should return true for v3 format', () => {
      const obj = { version: 3, history: [], folders: [] };
      expect(isExportFormatV3(obj)).toBe(true);
    });

    it('should return false for non-v3 formats', () => {
      const obj = { version: 4, history: [], folders: [] };
      expect(isExportFormatV3(obj)).toBe(false);
    });
  });

  describe('isExportFormatV4', () => {
    it('should return true for v4 format', () => {
      const obj = { version: 4, history: [], folders: [], prompts: [] };
      expect(isExportFormatV4(obj)).toBe(true);
    });

    it('should return false for non-v4 formats', () => {
      const obj = { version: 5, history: [], folders: [], prompts: [] };
      expect(isExportFormatV4(obj)).toBe(false);
    });
  });

  describe('isExportFormatV5', () => {
    it('should return true for v5 format', () => {
      const obj = { version: 5, history: [], folders: [], prompts: [] };
      expect(isExportFormatV5(obj)).toBe(true);
    });

    it('should return false for non-v5 formats', () => {
      const obj = { version: 6, history: [], folders: [], prompts: [] };
      expect(isExportFormatV5(obj)).toBe(false);
    });
  });

  describe('isChatGPTDataFormat', () => {
    it('should return true for ChatGPT Data format', () => {
      const obj = chatgptDataSample;
      expect(isChatGPTDataFormat(obj)).toBe(true);
    });

    it('should return false for non-ChatGPT formats', () => {
      const obj = { version: 3, history: [], folders: [] };
      expect(isChatGPTDataFormat(obj)).toBe(false);
    });
  });
});

describe('mergeData Functions', () => {
  it('should merge two data objects', () => {
    const currentTime = getCurrentUnixTime();
    const message1: Conversation = {
      id: '1',
      name: 'conversation 1',
      mapping: {
        '1': {
          id: '1',
          message: {
            id: '1',
            role: 'user',
            content: "what's up ?",
            create_time: currentTime,
          },
          parentMessageId: undefined,
          children: ['2'],
        },
        '2': {
          id: '2',
          message: {
            id: '2',
            role: 'assistant',
            content: 'Hi',
            create_time: currentTime,
          },
          parentMessageId: '1',
          children: [],
        },
      },
      model: OpenAIModels[OpenAIModelID.GPT_3_5],
      prompt: DEFAULT_SYSTEM_PROMPT,
      folderId: null,
      current_node: '2',
      create_time: currentTime,
      update_time: currentTime,
    };
    const message2: Conversation = {
      id: '2',
      name: 'conversation 2',
      mapping: {
        '3': {
          id: '3',
          message: {
            id: '3',
            role: 'user',
            content: 'Hello again',
            create_time: currentTime,
          },
          children: ['4'],
          parentMessageId: undefined,
        },
        '4': {
          id: '4',
          message: {
            id: '4',
            role: 'assistant',
            content: 'Again!',
            create_time: currentTime,
          },
          parentMessageId: '3',
          children: [],
        },
      },
      model: OpenAIModels[OpenAIModelID.GPT_4],
      prompt: DEFAULT_SYSTEM_PROMPT,
      folderId: null,
      current_node: '4',
      create_time: currentTime,
      update_time: currentTime,
    };
    const message3: Conversation = {
      id: '3',
      name: 'conversation 3',
      mapping: {
        '5': {
          id: '5',
          message: {
            id: '5',
            role: 'user',
            content: 'A third time?',
            create_time: currentTime,
          },
          children: ['6'],
          parentMessageId: undefined,
        },
        '6': {
          id: '6',
          message: {
            id: '6',
            role: 'assistant',
            content: 'Indeed',
            create_time: currentTime,
          },
          parentMessageId: '5',
          children: [],
        },
      },
      model: OpenAIModels[OpenAIModelID.GPT_4],
      prompt: DEFAULT_SYSTEM_PROMPT,
      folderId: null,
      current_node: '6',
      create_time: currentTime,
      update_time: currentTime,
    };
    const data1: LatestExportFormat = {
      version: 5,
      history: [message1, message3],
      folders: [],
      prompts: [],
    };
    const data2: LatestExportFormat = {
      version: 5,
      history: [message1, message2],
      folders: [],
      prompts: [],
    };
    const mergedData = {
      version: 5,
      history: [message1, message3, message2],
      folders: [],
      prompts: [],
    };
    expect(mergeData(data1, data2)).toEqual(mergedData);
  });
});

describe('cleanData Functions', () => {
  const currentTime = getCurrentUnixTime();
  const latestFormatNode1: ChatNode = {
    id: getChatNodeIdFromMessage(0),
    message: {
      id: getChatNodeIdFromMessage(0),
      role: 'user',
      content: "what's up ?",
      create_time: currentTime,
    },
    parentMessageId: undefined,
    children: [getChatNodeIdFromMessage(1)],
  };
  const latestFormatNode2: ChatNode = {
    id: getChatNodeIdFromMessage(1),
    message: {
      id: getChatNodeIdFromMessage(1),
      role: 'assistant',
      content: 'Hi',
      create_time: currentTime,
    },
    parentMessageId: latestFormatNode1.id,
    children: [],
  };
  const latestFormatWithoutFoldersOrPrompts: LatestExportFormat = {
    version: 5,
    history: [
      {
        id: '1',
        name: 'conversation 1',
        mapping: {
          [latestFormatNode1.id]: latestFormatNode1,
          [latestFormatNode2.id]: latestFormatNode2,
        },
        current_node: latestFormatNode2.id,
        model: OpenAIModels[OpenAIModelID.GPT_3_5],
        prompt: DEFAULT_SYSTEM_PROMPT,
        folderId: null,
        create_time: currentTime,
        update_time: currentTime,
      },
    ],
    folders: [],
    prompts: [],
  };

  const latestFormatWithFolders: LatestExportFormat = {
    ...latestFormatWithoutFoldersOrPrompts,
    folders: [
      {
        id: '1',
        name: 'folder 1',
        type: 'chat',
      },
    ],
    prompts: [],
  };
  const latestFormatWithFoldersAndPrompts: LatestExportFormat = {
    ...latestFormatWithFolders,
    prompts: [
      {
        id: '1',
        name: 'prompt 1',
        description: '',
        content: '',
        model: OpenAIModels[OpenAIModelID.GPT_3_5],
        folderId: null,
      },
    ],
  };
  describe('cleaning v1 data', () => {
    it('should return the latest format', () => {
      const data = [
        {
          id: 1,
          name: 'conversation 1',
          messages: [
            {
              role: 'user',
              content: "what's up ?",
            },
            {
              role: 'assistant',
              content: 'Hi',
            },
          ],
        },
      ] as ExportFormatV1;
      const obj = cleanData(data);
      expect(isLatestExportFormat(obj)).toBe(true);
      expect(obj).toEqual({
        ...latestFormatWithoutFoldersOrPrompts,
      });
    });
  });

  describe('cleaning v2 data', () => {
    it('should return the latest format', () => {
      const data = {
        history: [
          {
            id: '1',
            name: 'conversation 1',
            messages: [
              {
                role: 'user',
                content: "what's up ?",
              },
              {
                role: 'assistant',
                content: 'Hi',
              },
            ],
          },
        ],
        folders: [
          {
            id: 1,
            name: 'folder 1',
          },
        ],
      } as ExportFormatV2;
      const obj = cleanData(data);
      expect(isLatestExportFormat(obj)).toBe(true);
      expect(obj).toEqual(latestFormatWithFolders);
    });
  });

  describe('cleaning v3 data', () => {
    it('should return the latest format', () => {
      const data = {
        version: 3,
        history: [
          {
            id: '1',
            name: 'conversation 1',
            messages: [
              {
                role: 'user',
                content: "what's up ?",
              },
              {
                role: 'assistant',
                content: 'Hi',
              },
            ],
            model: OpenAIModels[OpenAIModelID.GPT_3_5],
            prompt: DEFAULT_SYSTEM_PROMPT,
            folderId: null,
          },
        ],
        folders: [
          {
            id: '1',
            name: 'folder 1',
            type: 'chat',
          },
        ],
      } as ExportFormatV3;
      const obj = cleanData(data);
      expect(isLatestExportFormat(obj)).toBe(true);
      expect(obj).toEqual(latestFormatWithFolders);
    });
  });

  describe('cleaning v4 data', () => {
    it('should return the latest format', () => {
      const data = {
        version: 4,
        history: [
          {
            id: '1',
            name: 'conversation 1',
            messages: [
              {
                role: 'user',
                content: "what's up ?",
              },
              {
                role: 'assistant',
                content: 'Hi',
              },
            ],
            model: OpenAIModels[OpenAIModelID.GPT_3_5],
            prompt: DEFAULT_SYSTEM_PROMPT,
            folderId: null,
          },
        ],
        folders: [
          {
            id: '1',
            name: 'folder 1',
            type: 'chat',
          },
        ],
        prompts: [
          {
            id: '1',
            name: 'prompt 1',
            description: '',
            content: '',
            model: OpenAIModels[OpenAIModelID.GPT_3_5],
            folderId: null,
          },
        ],
      } as ExportFormatV4;
      const obj = cleanData(data);
      expect(isLatestExportFormat(obj)).toBe(true);
      expect(obj).toEqual(latestFormatWithFoldersAndPrompts);
    });
  });

  describe('cleaning ChatGPT data', () => {
    it('should return the latest format', () => {
      const data = chatgptDataSample as InterceptedChatGPTFileFormat;

      const obj = convertChatGPTDataToNativeFormat(data);
      expect(isLatestExportFormat(obj)).toBe(true);

      expect(obj).toEqual(cleanedChatgptDataSample);
    });
  });
});
