import { Conversation } from "@/types";
import { IconPlus } from "@tabler/icons-react";
import { FC } from "react";
import { Conversations } from "../Conversations";
import { SidebarSettings } from "./SidebarSettings";

interface Props {
  conversations: Conversation[];
  lightMode: "light" | "dark";
  selectedConversation: Conversation;
  onNewConversation: () => void;
  onToggleLightMode: (mode: "light" | "dark") => void;
  onSelectConversation: (conversation: Conversation) => void;
  onDeleteConversation: (conversation: Conversation) => void;
}

export const Sidebar: FC<Props> = ({ conversations, lightMode, selectedConversation, onNewConversation, onToggleLightMode, onSelectConversation, onDeleteConversation }) => {
  return (
    <div className="flex flex-col bg-[#202123] min-w-[260px]">
      <div className="flex items-center justify-center h-[60px]">
        <button
          className="flex items-center w-[240px] h-[40px] rounded-lg bg-[#202123] border border-neutral-600 text-sm hover:bg-neutral-700"
          onClick={onNewConversation}
        >
          <IconPlus
            className="ml-4 mr-3"
            size={16}
          />
          New chat
        </button>
      </div>

      <div className="flex-1 mx-auto pb-2 overflow-auto">
        <Conversations
          conversations={conversations}
          selectedConversation={selectedConversation}
          onSelectConversation={onSelectConversation}
          onDeleteConversation={onDeleteConversation}
        />
      </div>

      <SidebarSettings
        lightMode={lightMode}
        onToggleLightMode={onToggleLightMode}
      />
    </div>
  );
};
