import { Conversation } from "@/types";
import { IconArrowBarLeft, IconPlus } from "@tabler/icons-react";
import { FC } from "react";
import { Conversations } from "./Conversations";
import { SidebarSettings } from "./SidebarSettings";

interface Props {
  loading: boolean;
  conversations: Conversation[];
  lightMode: "light" | "dark";
  selectedConversation: Conversation;
  onNewConversation: () => void;
  onToggleLightMode: (mode: "light" | "dark") => void;
  onSelectConversation: (conversation: Conversation) => void;
  onDeleteConversation: (conversation: Conversation) => void;
  onToggleSidebar: () => void;
  onRenameConversation: (conversation: Conversation, name: string) => void;
}

export const Sidebar: FC<Props> = ({ loading, conversations, lightMode, selectedConversation, onNewConversation, onToggleLightMode, onSelectConversation, onDeleteConversation, onToggleSidebar, onRenameConversation }) => {
  return (
    <div className="flex flex-col bg-[#202123] min-w-[260px]">
      <div className="flex items-center h-[60px] pl-2">
        <button
          className="flex items-center w-[220px] h-[40px] rounded-lg bg-[#202123] border border-neutral-600 text-sm hover:bg-neutral-700"
          onClick={onNewConversation}
        >
          <IconPlus
            className="ml-4 mr-3"
            size={16}
          />
          New chat
        </button>

        <IconArrowBarLeft
          className="ml-1 mr-2 text-neutral-300 cursor-pointer hover:text-neutral-400"
          onClick={onToggleSidebar}
        />
      </div>

      <div className="flex flex-1 justify-center pb-2 overflow-y-auto">
        <Conversations
          loading={loading}
          conversations={conversations}
          selectedConversation={selectedConversation}
          onSelectConversation={onSelectConversation}
          onDeleteConversation={onDeleteConversation}
          onRenameConversation={onRenameConversation}
        />
      </div>

      <SidebarSettings
        lightMode={lightMode}
        onToggleLightMode={onToggleLightMode}
      />
    </div>
  );
};
