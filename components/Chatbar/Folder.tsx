import { ChatFolder, Conversation, KeyValuePair } from "@/types";
import { IconCaretDown, IconCaretRight, IconCheck, IconPencil, IconTrash, IconX } from "@tabler/icons-react";
import { FC, KeyboardEvent, useEffect, useState } from "react";
import { ConversationComponent } from "./Conversation";

interface Props {
  searchTerm: string;
  conversations: Conversation[];
  currentFolder: ChatFolder;
  onDeleteFolder: (folder: number) => void;
  onUpdateFolder: (folder: number, name: string) => void;
  // conversation props
  selectedConversation: Conversation;
  loading: boolean;
  onSelectConversation: (conversation: Conversation) => void;
  onDeleteConversation: (conversation: Conversation) => void;
  onUpdateConversation: (conversation: Conversation, data: KeyValuePair) => void;
}

export const Folder: FC<Props> = ({
  searchTerm,
  conversations,
  currentFolder,
  onDeleteFolder,
  onUpdateFolder,
  // conversation props
  selectedConversation,
  loading,
  onSelectConversation,
  onDeleteConversation,
  onUpdateConversation
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const handleEnterDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleRename();
    }
  };

  const handleRename = () => {
    onUpdateFolder(currentFolder.id, renameValue);
    setRenameValue("");
    setIsRenaming(false);
  };

  const handleDrop = (e: any, folder: ChatFolder) => {
    if (e.dataTransfer) {
      setIsOpen(true);

      const conversation = JSON.parse(e.dataTransfer.getData("conversation"));
      onUpdateConversation(conversation, { key: "folderId", value: folder.id });

      e.target.style.background = "none";
    }
  };

  const allowDrop = (e: any) => {
    e.preventDefault();
  };

  const highlightDrop = (e: any) => {
    e.target.style.background = "#343541";
  };

  const removeHighlight = (e: any) => {
    e.target.style.background = "none";
  };

  useEffect(() => {
    if (isRenaming) {
      setIsDeleting(false);
    } else if (isDeleting) {
      setIsRenaming(false);
    }
  }, [isRenaming, isDeleting]);

  useEffect(() => {
    if (searchTerm) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [searchTerm]);

  return (
    <div>
      <div
        className={`mb-1 flex gap-3 items-center px-3 py-2 text-sm rounded-lg hover:bg-[#343541]/90 transition-colors duration-200 cursor-pointer`}
        onClick={() => setIsOpen(!isOpen)}
        onDrop={(e) => handleDrop(e, currentFolder)}
        onDragOver={allowDrop}
        onDragEnter={highlightDrop}
        onDragLeave={removeHighlight}
      >
        {isOpen ? <IconCaretDown size={16} /> : <IconCaretRight size={16} />}

        {isRenaming ? (
          <input
            className="flex-1 bg-transparent border-b border-neutral-400 focus:border-neutral-100 text-left overflow-hidden overflow-ellipsis pr-1 outline-none text-white"
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={handleEnterDown}
            autoFocus
          />
        ) : (
          <div className="overflow-hidden whitespace-nowrap overflow-ellipsis pr-1 flex-1 text-left">{currentFolder.name}</div>
        )}

        {(isDeleting || isRenaming) && (
          <div className="flex gap-1 -ml-2">
            <IconCheck
              className="min-w-[20px] text-neutral-400 hover:text-neutral-100"
              size={16}
              onClick={(e) => {
                e.stopPropagation();

                if (isDeleting) {
                  onDeleteFolder(currentFolder.id);
                } else if (isRenaming) {
                  handleRename();
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

        {!isDeleting && !isRenaming && (
          <div className="flex gap-1 ml-2">
            <IconPencil
              className="min-w-[20px] text-neutral-400 hover:text-neutral-100"
              size={18}
              onClick={(e) => {
                e.stopPropagation();
                setIsRenaming(true);
                setRenameValue(currentFolder.name);
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
      </div>

      {isOpen
        ? conversations.map((conversation, index) => {
            if (conversation.folderId === currentFolder.id) {
              return (
                <div
                  key={index}
                  className="ml-5 pl-2 border-l gap-2 pt-2"
                >
                  <ConversationComponent
                    selectedConversation={selectedConversation}
                    conversation={conversation}
                    loading={loading}
                    onSelectConversation={onSelectConversation}
                    onDeleteConversation={onDeleteConversation}
                    onUpdateConversation={onUpdateConversation}
                  />
                </div>
              );
            }
          })
        : null}
    </div>
  );
};
