import { IconFileImport } from '@tabler/icons-react';
import { FC } from 'react';
import { useTranslation } from 'next-i18next';
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

  const transformJSON = (inputFile: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = JSON.parse(e.target?.result as string);

      const outputData: {
        version: number;
        history: HistoryItem[];
        folders?: any[];
        prompts?: any[];
      } = {
        version: 4,
        history: [],
      };

      for (const item of data) {
        const historyItem: HistoryItem = {
          id: item.id,
          name: item.title,
          messages: [],
          model: {
            id: 'gpt-3.5-turbo',
            name: 'GPT-3.5',
            maxLength: 12000,
            tokenLimit: 4000,
          },
          prompt: "You are ChatGPT, a large language model trained by OpenAI. Follow the user's instructions carefully. Respond using markdown.",
          temperature: 0,
          folderId: null,
        };

        const mapping = item.mapping;
        for (const node_id in mapping) {
          const node = mapping[node_id];
          if (node && 'message' in node && node['message'] !== null && 'content' in node['message'] && node['message']['content'] !== null && 'parts' in node['message']['content']) {
            const role = node['message']['author']['role'];
            const content = node['message']['content']['parts'][0];
            const message: Message = {
              role: role,
              content: content,
            };
            historyItem.messages.push(message);
          }
        }

        outputData.history.push(historyItem);
      }

      outputData.folders = [];
      outputData.prompts = [];

      onImport(outputData);
    };

    reader.readAsText(inputFile);
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
          const importFile = document.querySelector('#import-file') as HTMLInputElement;
          if (importFile) {
            importFile.click();
          }
        }}
      />
    </>
  );
};
