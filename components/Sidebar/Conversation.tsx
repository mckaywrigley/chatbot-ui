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
    <div className="flex items-center relative">
      {isRenaming && selectedConversation.id === conversation.id ? (
        <div className="p-3 flex gap-3 w-full items-center bg-[#343541]/90">
        <IconMessage size={16} />
        <input
          className="flex-1 bg-[#343541]/90 border-neutral-400 focus:border-neutral-100 text-left overflow-hidden overflow-ellipsis mr-12 outline-none text-white"
          type="text"
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onKeyDown={handleEnterDown}
          autoFocus
        />
        </div>
      ) : (
        <button 
        className={`flex p-3 gap-3 w-full items-center text-sm rounded-lg hover:bg-[#343541]/90 transition-colors duration-200 cursor-pointer ${
          loading ? "disabled:cursor-not-allowed" : ""
        } ${
          selectedConversation.id === conversation.id ? "bg-[#343541]/90" : ""
        }`}
        onClick={() => onSelectConversation(conversation)}
        disabled={loading}
        draggable="true"
        onDragStart={(e) => handleDragStart(e, conversation)}
        >
        <IconMessage size={16} />
        <div className={`text-ellipsis max-h-5 overflow-hidden break-all relative whitespace-nowrap flex-1 text-left ${
          ( selectedConversation.id === conversation.id) ? "pr-12" : "pr-1"
        }`}>
          {conversation.name}
        </div>
        </button>
      )}

      {(isDeleting || isRenaming) &&
        selectedConversation.id === conversation.id && (
          <div className="flex absolute right-1 z-10 text-gray-300 visible">
            <button
              className="min-w-[20px] p-1 text-neutral-400 hover:text-neutral-100"
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
            >
              <IconCheck size={16} />
            </button>
            <button
              className="min-w-[20px] p-1 text-neutral-400 hover:text-neutral-100"
              onClick={(e) => {
                e.stopPropagation();
                setIsDeleting(false);
                setIsRenaming(false);
              }}
            >
              <IconX size={16} />
            </button>
          </div>
        )}

      {selectedConversation.id === conversation.id &&
        !isDeleting &&
        !isRenaming && (
          <div className="flex absolute right-1 z-10 text-gray-300 visible">
            <button
              className="min-w-[20px] p-1 text-neutral-400 hover:text-neutral-100"
              onClick={(e) => {
                e.stopPropagation();
                setIsRenaming(true);
                setRenameValue(selectedConversation.name);
              }}
            >
              <IconPencil size={18} />
            </button>
            <button
              className="min-w-[20px] p-1 text-neutral-400 hover:text-neutral-100"
              onClick={(e) => {
                e.stopPropagation();
                setIsDeleting(true);
              }}
            >
              <IconTrash size={18} />
            </button>
          </div>
        )}
    </div>
  );
};
