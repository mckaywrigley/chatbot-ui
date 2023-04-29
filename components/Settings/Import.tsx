import { IconFileImport } from '@tabler/icons-react';
import { FC, useState } from 'react';

import { useTranslation } from 'next-i18next';

import { SupportedExportFormats } from '@/types/export';

import { SidebarButton } from '../Sidebar/SidebarButton';

interface Props {
  onImport: (data: SupportedExportFormats) => void;
}

const isValidFile = (json: any): string[] => {
  const errors = [];

  if (!json || typeof json !== 'object') {
    errors.push('Invalid JSON format');
    return errors;
  }

  const { version, history, folders, prompts } = json;

  if (typeof version !== 'number' || !Array.isArray(history) || !Array.isArray(folders) || !Array.isArray(prompts)) {
    errors.push('Invalid file structure');
    return errors;
  }

  for (const historyItem of history) {
    if (
      !historyItem.id ||
      typeof historyItem.name !== 'string' ||
      !Array.isArray(historyItem.messages) ||
      typeof historyItem.model !== 'object' ||
      typeof historyItem.prompt !== 'string' ||
      typeof historyItem.temperature !== 'number'
    ) {
      errors.push('Invalid history item format');
      break;
    }

    for (const message of historyItem.messages) {
      if (!message.role || typeof message.content !== 'string') {
        errors.push('Invalid message format in history item');
        break;
      }
    }
  }

  return errors;
};

export const Import: FC<Props> = ({ onImport }) => {
  const { t } = useTranslation('sidebar');
  const [errors, setErrors] = useState<string[]>([]);

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
          const reader = new FileReader();
          reader.onload = (e) => {
            try {
              let json = JSON.parse(e.target?.result as string);
              const validationResult = isValidFile(json);

              if (validationResult.length === 0) {
                onImport(json);
                setErrors([]);
              } else {
                setErrors(validationResult);
              }
            } catch (error) {
              setErrors(['Invalid JSON file']);
            }
          };
          reader.readAsText(file);
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

      {/* Display the error messages */}
      {errors.length > 0 && (
        <div className="error-messages">
          {errors.map((error, index) => (
            <p key={index} className="error-message">
              {error}
            </p>
          ))}
        </div>
      )}
    </>
  );
};
