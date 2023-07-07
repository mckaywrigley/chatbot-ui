import { IconCheck, IconKey, IconX } from '@tabler/icons-react';
import {
  FC,
  KeyboardEvent,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { useTranslation } from 'next-i18next';

import { Models } from '@/utils/config/models';

import HomeContext from '@/pages/api/home/home.context';

import ChatbarContext from '../Chatbar/Chatbar.context';
import { SidebarButton } from '../Sidebar/SidebarButton';

export const Key = () => {
  const { t } = useTranslation('sidebar');
  const [isChanging, setIsChanging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    state: { apiKey, api },
  } = useContext(HomeContext);

  const [newKey, setNewKey] = useState(apiKey);

  const { handleApiKeyChange } = useContext(ChatbarContext);

  const choosenApiName = Models.find((model) => model.id === api)?.name;

  const handleEnterDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleUpdateKey(newKey);
    }
  };

  const handleUpdateKey = (newKey: string) => {
    handleApiKeyChange(newKey.trim());
    setIsChanging(false);
  };

  useEffect(() => {
    if (isChanging) {
      inputRef.current?.focus();
    }
  }, [isChanging]);

  return isChanging ? (
    <div className="duration:200 flex w-full cursor-pointer items-center rounded-md py-3 px-3 transition-colors bg-gray-300 dark:bg-neutral-800">
      <IconKey size={18} />

      <input
        ref={inputRef}
        className="ml-2 h-[20px] flex-1 overflow-hidden overflow-ellipsis border-b border-neutral-400 bg-transparent pr-1 text-[12.5px] leading-3 text-left text-white outline-none focus:border-neutral-100"
        type="password"
        value={newKey}
        onChange={(e) => setNewKey(e.target.value)}
        onKeyDown={handleEnterDown}
        placeholder={t('API Key') || 'API Key'}
      />

      <div className="flex w-[40px]">
        <IconCheck
          className="ml-auto min-w-[20px] text-neutral-400 hover:text-neutral-100"
          size={18}
          onClick={(e) => {
            e.stopPropagation();
            handleUpdateKey(newKey);
          }}
        />

        <IconX
          className="ml-auto min-w-[20px] text-neutral-400 hover:text-neutral-100"
          size={18}
          onClick={(e) => {
            e.stopPropagation();
            setIsChanging(false);
            setNewKey(apiKey);
          }}
        />
      </div>
    </div>
  ) : (
    <SidebarButton
      text={t(`${choosenApiName} API Key`)}
      icon={<IconKey size={18} />}
      onClick={() => setIsChanging(true)}
    />
  );
};
