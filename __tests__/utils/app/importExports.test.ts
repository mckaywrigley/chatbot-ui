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

import {
  cleanData,
  isExportFormatV1,
  isExportFormatV2,
  isExportFormatV3,
  isExportFormatV4,
  isExportFormatV5,
  isLatestExportFormat,
} from '@/utils/app/importExport';
import { ChatNode } from '@/types/chat';
import { getChatNodeIdFromMessage } from '@/utils/app/clean';

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
});

describe('cleanData Functions', () => {
  const latestFormatNode1: ChatNode = {
    id: getChatNodeIdFromMessage(0),
    message: {
      role: 'user',
      content: "what's up ?",
    },
    parentMessageId: undefined,
    children: [getChatNodeIdFromMessage(1)],
  };
  const latestFormatNode2: ChatNode = {
    id: getChatNodeIdFromMessage(1),
    message: {
      role: 'assistant',
      content: 'Hi',
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
      expect(obj).toEqual(latestFormatWithoutFoldersOrPrompts);
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
});
