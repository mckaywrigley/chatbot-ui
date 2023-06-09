import { IconFileImport } from '@tabler/icons-react';
import { FC } from 'react';
import { useTranslation } from 'next-i18next';
import { SupportedExportFormats } from '@/types/export';
import { SidebarButton } from '../Sidebar/SidebarButton';

interface Props {
  onImport: (data: SupportedExportFormats) => void;
}

interface Message {
  role: string;
  content: string;
}

interface HistoryItem {
  id: string;
  name: string;
  messages: Message[];
  model: {
    id: string;
    name: string;
    maxLength: number;
    tokenLimit: number;
  };
  prompt: string;
  temperature: number;
  folderId: null;
}

export const Import: FC<Props> = ({ onImport }) => {
  const { t } = useTranslation('sidebar');

  const isJSONFormatValid = (data: any): boolean => {
    if (Array.isArray(data)) {
      for (const item of data) {
        if (
          !(
            item.hasOwnProperty('title') &&
            item.hasOwnProperty('create_time') &&
            item.hasOwnProperty('update_time') &&
            item.hasOwnProperty('mapping')
          )
        ) {
          return false;
        }
      }
      return true;
    }
    return false;
  };

  const transformJSON = (inputFile: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = JSON.parse(e.target?.result as string);

      const outputData = (isJSONFormatValid(data)) ? transformOpenAIJSONData(data) : data;
      onImport(outputData);
    };

    reader.readAsText(inputFile);
  };

  const transformOpenAIJSONData = (data: any): SupportedExportFormats => {
    const transformedData: SupportedExportFormats = {
      version: 4,
      history: [],
      folders: [],
      prompts: []
    };

    for (const item of data) {
      const historyItem: HistoryItem = {
        id: item.id,
        name: item.title,
        messages: [],
        model: {
          id: '',
          name: '',
          maxLength: 12000,
          tokenLimit: 4000,
        },
        prompt: '',
        temperature: 1,
        folderId: null,
      };

      if (item.mapping) {
        const mappingKeys = Object.keys(item.mapping);
        for (const key of mappingKeys) {
          const message = item.mapping[key].message;
          if (message) {
            const role = message.author.role === 'user' ? 'user' : 'assistant';
            const content = message.content.parts.join('');
            historyItem.messages.push({ role, content });
          }
        }
      }

      transformedData.history.push(historyItem);
    }

    return transformedData;
  };

  return (
    <>
      <input
        id="import-file"
        className="sr-only"
        tabIndex={-1}
        type="file"
        accept=".json"
        onChange={(e) => {
          if (!e.target.files?.length) return;

          const file = e.target.files[0];
          transformJSON(file);
        }}
      />

      <SidebarButton
        text={t('Import data')}
        icon={<IconFileImport size={18} />}
        onClick={() => {
          const importFile = document.querySelector(
            '#import-file',
          ) as HTMLInputElement;
          if (importFile) {
            importFile.click();
          }
        }}
      />
    </>
  );
};
