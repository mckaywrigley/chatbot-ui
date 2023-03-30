import { IconCheck, IconKey, IconX } from '@tabler/icons-react';
import { useTranslation } from 'next-i18next';
import { FC, KeyboardEvent, useState } from 'react';
import { SidebarButton } from '../Sidebar/SidebarButton';

interface Props {
  apiKey: string;
  onApiKeyChange: (apiKey: string) => void;
}

export const Key: FC<Props> = ({ apiKey, onApiKeyChange }) => {
  const { t } = useTranslation('sidebar');
  const [isChanging, setIsChanging] = useState(false);
  const [newKey, setNewKey] = useState(apiKey);

  const handleEnterDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleUpdateKey(newKey);
    }
  };

  const handleUpdateKey = (newKey: string) => {
    onApiKeyChange(newKey.trim());
    setIsChanging(false);
  };

  return isChanging ? (
    <div className="relative flex items-center">
      <div className="flex w-full items-center gap-3 bg-[#343541]/90 p-3 rounded-lg">
      <IconKey size={18} />

      <input
        className="mr-12 flex-1 overflow-hidden overflow-ellipsis border-neutral-400 bg-transparent text-left text-[12.5px] leading-3 text-white outline-none focus:border-neutral-100"
        type="password"
        value={newKey}
        onChange={(e) => setNewKey(e.target.value)}
        onKeyDown={handleEnterDown}
        placeholder={t('API Key') || 'API Key'}
      />
      </div>

      <div className="absolute right-1 z-10 flex text-gray-300">
        <button
          className="min-w-[20px] p-1 text-neutral-400 hover:text-neutral-100"
          onClick={(e) => {
            e.stopPropagation();
            handleUpdateKey(newKey);
          }}
        >
          <IconCheck size={18} />
        </button>
        <button
          className="min-w-[20px] p-1 text-neutral-400 hover:text-neutral-100"
          onClick={(e) => {
            e.stopPropagation();
            setIsChanging(false);
            setNewKey(apiKey);
          }}
        >
          <IconX size={18} />
        </button>
      </div>
    </div>
  ) : (
    <SidebarButton
      text={t('OpenAI API Key')}
      icon={<IconKey size={18} />}
      onClick={() => setIsChanging(true)}
    />
  );
};
