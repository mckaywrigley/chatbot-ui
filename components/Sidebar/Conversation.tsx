import { Conversation, KeyValuePair } from '@/types';
import {
  IconCheck,
  IconMessage,
  IconPencil,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import { DragEvent, FC, KeyboardEvent, useEffect, useState } from 'react';

interface Props {
  selectedConversation: Conversation;
  conversation: Conversation;
  loading: boolean;
  onSelectConversation: (conversation: Conversation) => void;
  onDeleteConversation: (conversation: Conversation) => void;
  onUpdateConversation: (
    conversation: Conversation,
    data: KeyValuePair,
  ) => void;
}

export const ConversationComponent: FC<Props> = ({
  selectedConversation,
  conversation,
  loading,
  onSelectConversation,
  onDeleteConversation,
  onUpdateConversation,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  const handleEnterDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRename(selectedConversation);
    }
  };

  const handleDragStart = (
    e: DragEvent<HTMLButtonElement>,
    conversation: Conversation,
  ) => {
    if (e.dataTransfer) {
      e.dataTransfer.setData('conversation', JSON.stringify(conversation));
    }
  };

  const handleRename = (conversation: Conversation) => {
    onUpdateConversation(conversation, { key: 'name', value: renameValue });
    setRenameValue('');
    setIsRenaming(false);
  };

  useEffect(() => {
    if (isRenaming) {
      setIsDeleting(false);
    } else if (isDeleting) {
      setIsRenaming(false);
    }
  }, [isRenaming, isDeleting]);

  return (
    <button
      className={`flex w-full cursor-pointer items-center gap-3 rounded-lg p-3 text-sidebar transition-colors duration-200 hover:bg-[#343541]/90 ${
        loading ? 'disabled:cursor-not-allowed' : ''
      } ${
        selectedConversation.id === conversation.id ? 'bg-[#343541]/90' : ''
      }`}
      onClick={() => onSelectConversation(conversation)}
      disabled={loading}
      draggable="true"
      onDragStart={(e) => handleDragStart(e, conversation)}
    >
      <IconMessage size={18} />

      {isRenaming && selectedConversation.id === conversation.id ? (
        <input
          className="flex-1 overflow-hidden overflow-ellipsis border-b border-neutral-400 bg-transparent pr-1 text-left text-white outline-none focus:border-neutral-100"
          type="text"
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onKeyDown={handleEnterDown}
          autoFocus
        />
      ) : (
        <div className="flex-1 overflow-hidden overflow-ellipsis whitespace-nowrap pr-1 text-left">
          {conversation.name}
        </div>
      )}

      {(isDeleting || isRenaming) &&
        selectedConversation.id === conversation.id && (
          <div className="-ml-2 flex gap-1">
            <IconCheck
              className="min-w-[20px] text-neutral-400 hover:text-neutral-100"
              size={16}
              onClick={(e) => {
                e.stopPropagation();

                if (isDeleting) {
                  onDeleteConversation(conversation);
                } else if (isRenaming) {
                  handleRename(conversation);
                }

                setIsDeleting(false);
                setIsRenaming(false);
              }}
            />

            <IconX
              className="min-w-[20px] text-neutral-400 hover:text-neutral-100"
              size={16}
              onClick={(e) => {
                e.stopPropagation();
                setIsDeleting(false);
                setIsRenaming(false);
              }}
            />
          </div>
        )}

      {selectedConversation.id === conversation.id &&
        !isDeleting &&
        !isRenaming && (
          <div className="-ml-2 flex gap-1">
            <IconPencil
              className="min-w-[20px] text-neutral-400 hover:text-neutral-100"
              size={18}
              onClick={(e) => {
                e.stopPropagation();
                setIsRenaming(true);
                setRenameValue(selectedConversation.name);
              }}
            />

            <IconTrash
              className=" min-w-[20px] text-neutral-400 hover:text-neutral-100"
              size={18}
              onClick={(e) => {
                e.stopPropagation();
                setIsDeleting(true);
              }}
            />
          </div>
        )}
    </button>
  );
};
