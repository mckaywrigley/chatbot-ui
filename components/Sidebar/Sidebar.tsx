import { Conversation } from "@/types";
import { IconArrowBarLeft, IconPlus } from "@tabler/icons-react";
import { FC, useEffect, useState } from "react";
import { Conversations } from "./Conversations";
import { Search } from "./Search";
import { SidebarSettings } from "./SidebarSettings";

interface Props {
  loading: boolean;
  conversations: Conversation[];
  lightMode: "light" | "dark";
  selectedConversation: Conversation;
  apiKey: string;
  onNewConversation: () => void;
  onToggleLightMode: (mode: "light" | "dark") => void;
  onSelectConversation: (conversation: Conversation) => void;
  onDeleteConversation: (conversation: Conversation) => void;
  onToggleSidebar: () => void;
  onRenameConversation: (conversation: Conversation, name: string) => void;
  onApiKeyChange: (apiKey: string) => void;
}

export const Sidebar: FC<Props> = ({ loading, conversations, lightMode, selectedConversation, apiKey, onNewConversation, onToggleLightMode, onSelectConversation, onDeleteConversation, onToggleSidebar, onRenameConversation, onApiKeyChange }) => {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>(conversations);

  useEffect(() => {
    if (searchTerm) {
      setFilteredConversations(conversations.filter((conversation) => conversation.name.toLowerCase().includes(searchTerm.toLowerCase())));
    } else {
      setFilteredConversations(conversations);
    }
  }, [searchTerm, conversations]);

  return (
    <div className={`flex flex-col bg-[#202123] min-w-full sm:min-w-[260px] sm:max-w-[260px] z-10`}>
      <div className="flex items-center h-[60px] sm:pl-2 px-2">
        <button
          className="flex items-center w-full sm:w-[200px] h-[40px] rounded-lg bg-[#202123] border border-neutral-600 text-sm hover:bg-neutral-700"
          onClick={() => {
            onNewConversation();
            setSearchTerm("");
          }}
        >
          <IconPlus
            className="ml-4 mr-3"
            size={16}
          />
          New chat
        </button>

        <IconArrowBarLeft
          className="ml-1 p-1 text-neutral-300 cursor-pointer hover:text-neutral-400 hidden sm:flex"
          size={38}
          onClick={onToggleSidebar}
        />
      </div>

      {conversations.length > 1 && (
        <Search
          searchTerm={searchTerm}
          onSearch={setSearchTerm}
        />
      )}

      <div className="flex-1 overflow-auto">
        <Conversations
          loading={loading}
          conversations={filteredConversations}
          selectedConversation={selectedConversation}
          onSelectConversation={onSelectConversation}
          onDeleteConversation={(conversation) => {
            onDeleteConversation(conversation);
            setSearchTerm("");
          }}
          onRenameConversation={(conversation, name) => {
            onRenameConversation(conversation, name);
            setSearchTerm("");
          }}
        />
      </div>

      <SidebarSettings
        lightMode={lightMode}
        apiKey={apiKey}
        onToggleLightMode={onToggleLightMode}
        onApiKeyChange={onApiKeyChange}
      />
    </div>
  );
};
