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
}

export const Sidebar: FC<Props> = ({ loading, conversations, lightMode, selectedConversation, onNewConversation, onToggleLightMode, onSelectConversation, onDeleteConversation, onToggleSidebar }) => {
  return (
    <div className="flex flex-col bg-[#202123] min-w-[260px]">
      <div className="flex items-center h-[60px] pl-4">
        <button
          className="flex items-center w-[190px] h-[40px] rounded-lg bg-[#202123] border border-neutral-600 text-sm hover:bg-neutral-700"
          onClick={onNewConversation}
        >
          <IconPlus
            className="ml-4 mr-3"
            size={16}
          />
          New chat
        </button>

        <IconArrowBarLeft
          className="ml-auto mr-4 text-neutral-300 cursor-pointer hover:text-neutral-400"
          onClick={onToggleSidebar}
        />
      </div>

      <div className="flex-1 mx-auto pb-2 overflow-auto">
        <Conversations
          loading={loading}
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
