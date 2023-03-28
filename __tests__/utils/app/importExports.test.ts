import { ExportFormatV1, ExportFormatV2 } from '@/types/export';
import { OpenAIModels, OpenAIModelID } from '@/types/openai';
import { DEFAULT_SYSTEM_PROMPT } from '@/utils/app/const';
import {
  cleanData,
  isExportFormatV1,
  isExportFormatV2,
  isExportFormatV3,
  isLatestExportFormat,
} from '@/utils/app/importExport';

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
        version: 3,
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
      });
    });
  });
});
