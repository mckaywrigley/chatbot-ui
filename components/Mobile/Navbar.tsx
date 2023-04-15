import { Conversation } from '@/types/chat';
import { IconPlus } from '@tabler/icons-react';
import { FC } from 'react';
import { StoreConversationButton } from '../Global/StoreConversationButton';

interface Props {
  selectedConversation: Conversation;
  onNewConversation: () => void;
}

export const Navbar: FC<Props> = ({
  selectedConversation,
  onNewConversation,
}) => {
  return (
    <nav className="flex w-full items-center justify-between bg-[#202123] py-3 px-4">
      <div className="mr-4 pl-8">
        {selectedConversation.name !== 'New conversation' && (
          <StoreConversationButton conversation={selectedConversation} />
        )}
      </div>

      <div className="max-w-[240px] overflow-hidden text-ellipsis whitespace-nowrap">
        {selectedConversation.name}
      </div>

      <IconPlus
        className="mr-10 ml-2 cursor-pointer hover:text-neutral-400"
        onClick={onNewConversation}
      />
    </nav>
  );
};
