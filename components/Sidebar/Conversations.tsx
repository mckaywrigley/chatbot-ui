import { Conversation } from "@/types";
import { IconCheck, IconMessage, IconPencil, IconTrash, IconX } from "@tabler/icons-react";
import { FC, KeyboardEvent, useEffect, useState } from "react";

interface Props {
  loading: boolean;
  conversations: Conversation[];
  selectedConversation: Conversation;
  onSelectConversation: (conversation: Conversation) => void;
  onDeleteConversation: (conversation: Conversation) => void;
  onRenameConversation: (conversation: Conversation, name: string) => void;
}

export const Conversations: FC<Props> = ({ loading, conversations, selectedConversation, onSelectConversation, onDeleteConversation, onRenameConversation }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  const handleEnterDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleRename(selectedConversation);
    }
  };

  const handleRename = (conversation: Conversation) => {
    onRenameConversation(conversation, renameValue);
    setRenameValue("");
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
    <div className="flex flex-col space-y-2 w-full px-2">
      {conversations.map((conversation, index) => (
        <button
          key={index}
          className={`flex items-center justify-start h-[40px] px-2 text-sm rounded-lg hover:bg-neutral-700 cursor-pointer ${loading ? "disabled:cursor-not-allowed" : ""} ${selectedConversation.id === conversation.id ? "bg-slate-600" : ""}`}
          onClick={() => onSelectConversation(conversation)}
          disabled={loading}
        >
          <IconMessage
            className="mr-2 min-w-[20px]"
            size={18}
          />

          {isRenaming && selectedConversation.id === conversation.id ? (
            <input
              className="flex-1 bg-transparent border-b border-neutral-400 focus:border-neutral-100 text-left overflow-hidden overflow-ellipsis pr-1 outline-none text-white"
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={handleEnterDown}
              autoFocus
            />
          ) : (
            <div className="overflow-hidden whitespace-nowrap overflow-ellipsis pr-1 flex-1 text-left">{conversation.name}</div>
          )}

          {(isDeleting || isRenaming) && selectedConversation.id === conversation.id && (
            <div className="flex w-[40px]">
              <IconCheck
                className="ml-auto min-w-[20px] text-neutral-400 hover:text-neutral-100"
                size={18}
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
                className="ml-auto min-w-[20px] text-neutral-400 hover:text-neutral-100"
                size={18}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDeleting(false);
                  setIsRenaming(false);
                }}
              />
            </div>
          )}

          {selectedConversation.id === conversation.id && !isDeleting && !isRenaming && (
            <div className="flex w-[40px]">
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
      ))}
    </div>
  );
};
