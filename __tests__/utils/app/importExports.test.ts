import {
  ExportFormatV1,
  ExportFormatV2,
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
  isLatestExportFormat,
  mergeData,
} from '@/utils/app/importExport';
import {
  convertChatGPTDataToNativeFormat,
  isChatGPTDataFormat,
} from '@/utils/app/chatgpt/chatgpt-data';
import type { InterceptedChatGPTFileFormat } from '@/utils/app/chatgpt/chatgpt-data';
import { Conversation } from '@/types/chat';

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
    const message1: Conversation = {
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
    };
    const message2: Conversation = {
      id: '2',
      name: 'conversation 2',
      messages: [
        {
          role: 'user',
          content: 'Hello again',
        },
        {
          role: 'assistant',
          content: 'Again!',
        },
      ],
      model: OpenAIModels[OpenAIModelID.GPT_4],
      prompt: DEFAULT_SYSTEM_PROMPT,
      folderId: null,
    };
    const message3: Conversation = {
      id: '3',
      name: 'conversation 3',
      messages: [
        {
          role: 'user',
          content: 'A third time?',
        },
        {
          role: 'assistant',
          content: 'Indeed',
        },
      ],
      model: OpenAIModels[OpenAIModelID.GPT_4],
      prompt: DEFAULT_SYSTEM_PROMPT,
      folderId: null,
    };
    const data1: LatestExportFormat = {
      version: 4,
      history: [message1, message3],
      folders: [],
      prompts: [],
    };
    const data2: LatestExportFormat = {
      version: 4,
      history: [message1, message2],
      folders: [],
      prompts: [],
    };
    const mergedData = {
      version: 4,
      history: [message1, message3, message2],
      folders: [],
      prompts: [],
    };
    expect(mergeData(data1, data2)).toEqual(mergedData);
  });
});

describe('cleanData Functions', () => {
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
        version: 4,
        history: [
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
            model: OpenAIModels[OpenAIModelID.GPT_3_5],
            prompt: DEFAULT_SYSTEM_PROMPT,
            folderId: null,
          },
        ],
        folders: [],
        prompts: [],
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
      expect(obj).toEqual({
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
        prompts: [],
      });
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
      expect(obj).toEqual({
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
      });
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
