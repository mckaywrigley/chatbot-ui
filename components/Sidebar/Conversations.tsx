import { Conversation } from "@/types";
import {
  IconCheck,
  IconMessage,
  IconPencilMinus,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { FC, useEffect, useRef } from "react";

interface Props {
  editing: number;
  loading: boolean;
  conversations: Conversation[];
  newConversationName: string;
  selectedConversation: Conversation;
  onSelectConversation: (conversation: Conversation) => void;
  onDeleteConversation: (conversation: Conversation) => void;
  //
  onConfirmRenameConversation: (
    conversation: Conversation,
    newName: string
  ) => void;
  onBeginRenameConversation: (conversation: Conversation) => void;
  onCancelRenameConversation: (conversation: Conversation) => void;
  onSetNewConversationName: (newName: string) => void;
}

export const Conversations: FC<Props> = ({
  editing,
  loading,
  conversations,
  newConversationName,
  selectedConversation,
  onSelectConversation,
  onDeleteConversation,
  onConfirmRenameConversation,
  onBeginRenameConversation,
  onCancelRenameConversation,
  onSetNewConversationName,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing !== -1) {
      const input = document.getElementById(
        `input-${editing}`
      ) as HTMLInputElement;
      if (input) {
        input.focus();
      }
    }
  }, [editing]);

  return (
    <div className="flex flex-col space-y-2">
      {conversations.map((conversation, index) => (
        <button
          key={index}
          className={`flex items-center justify-start w-[240px] h-[40px] px-2 text-sm rounded-lg hover:bg-neutral-700 cursor-pointer ${
            loading ? "disabled:cursor-not-allowed" : ""
          } ${
            selectedConversation.id === conversation.id ? "bg-slate-600" : ""
          }`}
          onClick={() => onSelectConversation(conversation)}
          disabled={loading}
        >
          <IconMessage className="mr-2 min-w-[20px]" size={18} />
          <div className="overflow-hidden whitespace-nowrap overflow-ellipsis pr-1 text-left w-full">
            {editing == conversation.id ? (
              <input
                className="bg-transparent outline-none"
                id={`input-${conversation.id}`}
                ref={inputRef}
                onBlur={(e) =>
                  onConfirmRenameConversation(conversation, newConversationName)
                }
                onChange={(e) => onSetNewConversationName(e.target.value)}
                value={newConversationName}
              ></input>
            ) : conversation.name ? (
              conversation.name
            ) : conversation.messages[0] ? (
              conversation.messages[0].content
            ) : (
              "Empty conversation"
            )}
          </div>

          {editing == conversation.id ? (
            <>
              <IconCheck
                className="ml-auto min-w-[20px] text-neutral-400 hover:text-neutral-100"
                size={18}
                onClick={(e) => {
                  e.stopPropagation();
                  onConfirmRenameConversation(
                    conversation,
                    newConversationName
                  );
                }}
              />

              <IconX
                className="ml-auto min-w-[20px] text-neutral-400 hover:text-neutral-100"
                size={18}
                onClick={(e) => {
                  e.stopPropagation();
                  onCancelRenameConversation(conversation);
                }}
              />
            </>
          ) : (
            <>
              <IconPencilMinus
                className="ml-auto min-w-[20px] text-neutral-400 hover:text-neutral-100"
                size={18}
                onClick={(e) => {
                  e.stopPropagation();
                  onBeginRenameConversation(conversation);
                }}
              />

              <IconTrash
                className="ml-auto min-w-[20px] text-neutral-400 hover:text-neutral-100"
                size={18}
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteConversation(conversation);
                }}
              />
            </>
          )}
        </button>
      ))}
    </div>
  );
};
