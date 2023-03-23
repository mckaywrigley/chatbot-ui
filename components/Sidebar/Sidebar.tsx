import { Conversation, KeyValuePair } from "@/types";
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
  onUpdateConversation: (conversation: Conversation, data: KeyValuePair) => void;
  onApiKeyChange: (apiKey: string) => void;
  onClearConversations: () => void;
  onExportConversations: () => void;
  onImportConversations: (conversations: Conversation[]) => void;
}

export const Sidebar: FC<Props> = ({ loading, conversations, lightMode, selectedConversation, apiKey, onNewConversation, onToggleLightMode, onSelectConversation, onDeleteConversation, onToggleSidebar, onUpdateConversation, onApiKeyChange, onClearConversations, onExportConversations, onImportConversations }) => {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>(conversations);

  useEffect(() => {
    if (searchTerm) {
      setFilteredConversations(conversations.filter((conversation) => {
        const searchable = conversation.name.toLocaleLowerCase() + ' ' + conversation.messages.map((message) => message.content).join(" ");
        return searchable.toLowerCase().includes(searchTerm.toLowerCase());
      }
      ));
    } else {
      setFilteredConversations(conversations);
    }
  }, [searchTerm, conversations]);

  return (
    <aside className={`h-full flex flex-none space-y-2 p-2 flex-col bg-[#202123] w-[260px] z-10 sm:relative sm:top-0 absolute top-12 bottom-0`}>
      <header className="flex items-center">
        <button
          className="flex gap-3 p-3 items-center w-full sm:w-[200px] rounded-md hover:bg-gray-500/10 transition-colors duration-200 text-white cursor-pointer text-sm flex-shrink-0 border border-white/20"
          onClick={() => {
            onNewConversation();
            setSearchTerm("");
          }}
        >
          <IconPlus
            className=""
            size={16}
          />
          New chat
        </button>

        <IconArrowBarLeft
          className="ml-1 p-1 text-neutral-300 cursor-pointer hover:text-neutral-400 hidden sm:flex"
          size={32}
          onClick={onToggleSidebar}
        />
      </header>

      {conversations.length > 1 && (
        <Search
          searchTerm={searchTerm}
          onSearch={setSearchTerm}
        />
      )}

      <div className="flex-grow overflow-auto">
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
            onUpdateConversation(conversation, { key: "name", value: name });
            setSearchTerm("");
          }}
        />
      </div>

      <SidebarSettings
        lightMode={lightMode}
        apiKey={apiKey}
        onToggleLightMode={onToggleLightMode}
        onApiKeyChange={onApiKeyChange}
        onClearConversations={onClearConversations}
        onExportConversations={onExportConversations}
        onImportConversations={onImportConversations}
      />
    </aside>
  );
};
