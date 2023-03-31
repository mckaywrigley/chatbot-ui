import { IconCheck, IconTrash, IconX } from '@tabler/icons-react';
import { useTranslation } from 'next-i18next';
import { FC, useState } from 'react';
import { SidebarButton } from '../Sidebar/SidebarButton';

interface Props {
  onClearConversations: () => void;
}

export const ClearConversations: FC<Props> = ({ onClearConversations }) => {
  const [isConfirming, setIsConfirming] = useState<boolean>(false);

  const { t } = useTranslation('sidebar');

  const handleClearConversations = () => {
    onClearConversations();
    setIsConfirming(false);
  };

  return isConfirming ? (
    <div className="flex w-full gap-3 relative items-center rounded-lg p-3 hover:bg-gray-500/10">
      <IconTrash size={18} />

      <div className="text-[14px] leading-3 text-white">
        {t('Are you sure?')}
      </div>

      <div className="absolute right-1 z-10 flex text-gray-300">
        <button
          className="min-w-[20px] p-1 text-neutral-400 hover:text-neutral-100"
          onClick={(e) => {
            e.stopPropagation();
            handleClearConversations();
          }}
        >
        <IconCheck size={18} />
        </button>

        <button
          className="min-w-[20px] p-1 text-neutral-400 hover:text-neutral-100"
          onClick={(e) => {
            e.stopPropagation();
            setIsConfirming(false);
          }}
        >
        <IconX size={18} />
        </button>
      </div>
    </div>
  ) : (
    <SidebarButton
      text={t('Clear conversations')}
      icon={<IconTrash size={18} />}
      onClick={() => setIsConfirming(true)}
    />
  );
};
