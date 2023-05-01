import {
  IconCheck,
  IconDeviceLaptop,
  IconEdit,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import { MouseEventHandler, useContext, useState } from 'react';

import { SystemPrompt } from '@/types/systemPrompt';

import HomeContext from '@/pages/api/home/home.context';

import SidebarActionButton from '@/components/Buttons/SidebarActionButton';

import { SystemPromptEditModal } from './SystemPromptEditModal';

interface Props {
  systemPrompt: SystemPrompt;
}

export const SystemPromptComponent = ({ systemPrompt }: Props) => {
  const { handleDeleteSystemPrompt } = useContext(HomeContext);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const handleConfirm: MouseEventHandler<HTMLButtonElement> = (e) => {
    e.stopPropagation();
    handleDeleteSystemPrompt(systemPrompt.id);
    setIsDeleting(false);
  };

  const handleCancel: MouseEventHandler<HTMLButtonElement> = (e) => {
    e.stopPropagation();
    setIsDeleting(false);
  };

  const handleOpenEditModal: MouseEventHandler<HTMLButtonElement> = (e) => {
    e.stopPropagation();
    setShowModal(true);
  };
  const handleOpenDeleteModal: MouseEventHandler<HTMLButtonElement> = (e) => {
    e.stopPropagation();
    setIsDeleting(true);
  };

  return (
    <div className="relative flex items-center">
      <button className="flex w-full cursor-pointer items-center gap-3 rounded-lg p-3 text-sm transition-colors duration-200">
        <IconDeviceLaptop
          size={18}
          className="text-neutral-900 dark:text-neutral-200"
        />
        <div
          className={`text-neutral-900 dark:text-neutral-200 relative max-h-5 flex-1 overflow-hidden text-ellipsis whitespace-nowrap
          break-all text-left text-[12.5px] leading-3`}
        >
          {systemPrompt.name}
        </div>
      </button>
      {isDeleting && (
        <div className="text-neutral-900 dark:text-neutral-200 absolute right-1 z-10 flex">
          <SidebarActionButton
            handleClick={handleConfirm}
            className="text-neutral-600 dark:text-neutral-200 min-w-[20px] p-1 hover:text-neutral-900 dark:hover:text-neutral-100"
          >
            <IconCheck size={18} />
          </SidebarActionButton>
          <SidebarActionButton
            handleClick={handleCancel}
            className="text-neutral-600 dark:text-neutral-200 min-w-[20px] p-1 hover:text-neutral-900 dark:hover:text-neutral-100"
          >
            <IconX size={18} />
          </SidebarActionButton>
        </div>
      )}

      {!isDeleting && (
        <div className="absolute right-1 z-10 flex ">
          <SidebarActionButton
            handleClick={handleOpenEditModal}
            className="text-neutral-500 dark:text-neutral-200 min-w-[20px] p-1 hover:text-neutral-900 dark:hover:text-neutral-100"
          >
            <IconEdit size={18} />
          </SidebarActionButton>
          <SidebarActionButton
            handleClick={handleOpenDeleteModal}
            className="text-neutral-500 dark:text-neutral-200 min-w-[20px] p-1 hover:text-neutral-900 dark:hover:text-neutral-100"
          >
            <IconTrash size={18} />
          </SidebarActionButton>
        </div>
      )}

      {showModal && (
        <SystemPromptEditModal
          systemPrompt={systemPrompt}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
};
