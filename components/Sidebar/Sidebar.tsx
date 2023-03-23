import { ChatFolder, Conversation, KeyValuePair } from "@/types";
import { IconArrowBarLeft, IconFolderPlus, IconPlus } from "@tabler/icons-react";
import { FC, useEffect, useState } from "react";
import { Conversations } from "./Conversations";
import { Folders } from "./Folders";
import { Search } from "./Search";
import { SidebarSettings } from "./SidebarSettings";

interface Props {
  loading: boolean;
  conversations: Conversation[];
  lightMode: "light" | "dark";
  selectedConversation: Conversation;
  apiKey: string;
  folders: ChatFolder[];
  onCreateFolder: (name: string) => void;
  onDeleteFolder: (folderId: number) => void;
  onUpdateFolder: (folderId: number, name: string) => void;
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

export const Sidebar: FC<Props> = ({ loading, conversations, lightMode, selectedConversation, apiKey, folders, onCreateFolder, onDeleteFolder, onUpdateFolder, onNewConversation, onToggleLightMode, onSelectConversation, onDeleteConversation, onToggleSidebar, onUpdateConversation, onApiKeyChange, onClearConversations, onExportConversations, onImportConversations }) => {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>(conversations);

  const handleUpdateConversation = (conversation: Conversation, data: KeyValuePair) => {
    onUpdateConversation(conversation, data);
    setSearchTerm("");
  };

  const handleDeleteConversation = (conversation: Conversation) => {
    onDeleteConversation(conversation);
    setSearchTerm("");
  };

  const handleDrop = (e: any) => {
    if (e.dataTransfer) {
      const conversation = JSON.parse(e.dataTransfer.getData("conversation"));
      onUpdateConversation(conversation, { key: "folderId", value: 0 });

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
    if (searchTerm) {
      setFilteredConversations(
        conversations.filter((conversation) => {
          const searchable = conversation.name.toLocaleLowerCase() + " " + conversation.messages.map((message) => message.content).join(" ");
          return searchable.toLowerCase().includes(searchTerm.toLowerCase());
        })
      );
    } else {
      setFilteredConversations(conversations);
    }
  }, [searchTerm, conversations]);

  return (
    <aside className={`h-full flex flex-none space-y-2 p-2 flex-col bg-[#202123] w-[260px] z-10 sm:relative sm:top-0 absolute top-12 bottom-0`}>
      <header className="flex items-center">
        <button
          className="flex gap-3 p-3 items-center w-[190px] rounded-md hover:bg-gray-500/10 transition-colors duration-200 text-white cursor-pointer text-sm flex-shrink-0 border border-white/20"
          onClick={() => {
            onNewConversation();
            setSearchTerm("");
          }}
        >
          <IconPlus size={16} />
          New chat
        </button>

        <button
          className="ml-2 flex gap-3 p-3 items-center rounded-md hover:bg-gray-500/10 transition-colors duration-200 text-white cursor-pointer text-sm flex-shrink-0 border border-white/20"
          onClick={() => onCreateFolder("New folder")}
        >
          <IconFolderPlus size={16} />
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
        {folders.length > 0 && (
          <div className="flex border-b border-white/20 pb-2">
            <Folders
              searchTerm={searchTerm}
              conversations={filteredConversations.filter((conversation) => conversation.folderId !== 0)}
              folders={folders}
              onDeleteFolder={onDeleteFolder}
              onUpdateFolder={onUpdateFolder}
              selectedConversation={selectedConversation}
              loading={loading}
              onSelectConversation={onSelectConversation}
              onDeleteConversation={handleDeleteConversation}
              onUpdateConversation={handleUpdateConversation}
            />
          </div>
        )}

        {conversations.length > 0 ? (
          <div
            className="pt-2 h-full"
            onDrop={(e) => handleDrop(e)}
            onDragOver={allowDrop}
            onDragEnter={highlightDrop}
            onDragLeave={removeHighlight}
          >
            <Conversations
              loading={loading}
              conversations={filteredConversations.filter((conversation) => conversation.folderId === 0)}
              selectedConversation={selectedConversation}
              onSelectConversation={onSelectConversation}
              onDeleteConversation={handleDeleteConversation}
              onUpdateConversation={handleUpdateConversation}
            />
          </div>
        ) : (
          <div className="mt-4 text-white text-center">
            <div>No conversations.</div>
          </div>
        )}
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
