import { ChatFolder, Conversation, KeyValuePair } from '@/types';
import {
  IconArrowBarLeft,
  IconFolderPlus,
  IconMessagesOff,
  IconPlus,
} from '@tabler/icons-react';
import { FC, useEffect, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { Conversations } from './Conversations';
import { Folders } from './Folders';
import { Search } from './Search';
import { SidebarSettings } from './SidebarSettings';

interface Props {
  loading: boolean;
  conversations: Conversation[];
  lightMode: 'light' | 'dark';
  selectedConversation: Conversation;
  apiKey: string;
  folders: ChatFolder[];
  onCreateFolder: (name: string) => void;
  onDeleteFolder: (folderId: number) => void;
  onUpdateFolder: (folderId: number, name: string) => void;
  onNewConversation: () => void;
  onToggleLightMode: (mode: 'light' | 'dark') => void;
  onSelectConversation: (conversation: Conversation) => void;
  onDeleteConversation: (conversation: Conversation) => void;
  onToggleSidebar: () => void;
  onUpdateConversation: (
    conversation: Conversation,
    data: KeyValuePair,
  ) => void;
  onApiKeyChange: (apiKey: string) => void;
  onClearConversations: () => void;
  onExportConversations: () => void;
  onImportConversations: (data: {
    conversations: Conversation[];
    folders: ChatFolder[];
  }) => void;
}

export const Sidebar: FC<Props> = ({
  loading,
  conversations,
  lightMode,
  selectedConversation,
  apiKey,
  folders,
  onCreateFolder,
  onDeleteFolder,
  onUpdateFolder,
  onNewConversation,
  onToggleLightMode,
  onSelectConversation,
  onDeleteConversation,
  onToggleSidebar,
  onUpdateConversation,
  onApiKeyChange,
  onClearConversations,
  onExportConversations,
  onImportConversations,
}) => {
  const { t } = useTranslation('sidebar');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filteredConversations, setFilteredConversations] =
    useState<Conversation[]>(conversations);

  const handleUpdateConversation = (
    conversation: Conversation,
    data: KeyValuePair,
  ) => {
    onUpdateConversation(conversation, data);
    setSearchTerm('');
  };

  const handleDeleteConversation = (conversation: Conversation) => {
    onDeleteConversation(conversation);
    setSearchTerm('');
  };

  const handleDrop = (e: any) => {
    if (e.dataTransfer) {
      const conversation = JSON.parse(e.dataTransfer.getData('conversation'));
      onUpdateConversation(conversation, { key: 'folderId', value: 0 });

      e.target.style.background = 'none';
    }
  };

  const allowDrop = (e: any) => {
    e.preventDefault();
  };

  const highlightDrop = (e: any) => {
    e.target.style.background = '#343541';
  };

  const removeHighlight = (e: any) => {
    e.target.style.background = 'none';
  };

  useEffect(() => {
    if (searchTerm) {
      setFilteredConversations(
        conversations.filter((conversation) => {
          const searchable =
            conversation.name.toLocaleLowerCase() +
            ' ' +
            conversation.messages.map((message) => message.content).join(' ');
          return searchable.toLowerCase().includes(searchTerm.toLowerCase());
        }),
      );
    } else {
      setFilteredConversations(conversations);
    }
  }, [searchTerm, conversations]);

  return (
    <aside
      className={`fixed top-0 bottom-0 z-50 flex h-full w-[260px] flex-none flex-col space-y-2 bg-[#202123] p-2 transition-all sm:relative sm:top-0`}
    >
      <header className="flex items-center">
        <button
          className="flex w-[190px] flex-shrink-0 cursor-pointer items-center gap-3 rounded-md border border-white/20 p-3 text-[12.5px] leading-3 text-white transition-colors duration-200 select-none hover:bg-gray-500/10"
          onClick={() => {
            onNewConversation();
            setSearchTerm('');
          }}
        >
          <IconPlus size={18} />
          {t('New chat')}
        </button>

        <button
          className="ml-2 flex flex-shrink-0 cursor-pointer items-center gap-3 rounded-md border border-white/20 p-3 text-[12.5px] leading-3 text-white transition-colors duration-200 hover:bg-gray-500/10"
          onClick={() => onCreateFolder(t('New folder'))}
        >
          <IconFolderPlus size={18} />
        </button>

        <IconArrowBarLeft
          className="ml-1 hidden cursor-pointer p-1 text-neutral-300 hover:text-neutral-400 sm:flex"
          size={32}
          onClick={onToggleSidebar}
        />
      </header>

      {conversations.length > 1 && (
        <Search searchTerm={searchTerm} onSearch={setSearchTerm} />
      )}

      <div className="flex-grow overflow-y-auto overflow-x-clip">
        {folders.length > 0 && (
          <div className="flex border-b border-white/20 pb-2">
            <Folders
              searchTerm={searchTerm}
              conversations={filteredConversations.filter(
                (conversation) => conversation.folderId !== 0,
              )}
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
            className="h-full pt-2"
            onDrop={(e) => handleDrop(e)}
            onDragOver={allowDrop}
            onDragEnter={highlightDrop}
            onDragLeave={removeHighlight}
          >
            <Conversations
              loading={loading}
              conversations={filteredConversations.filter(
                (conversation) =>
                  conversation.folderId === 0 ||
                  !folders[conversation.folderId - 1],
              )}
              selectedConversation={selectedConversation}
              onSelectConversation={onSelectConversation}
              onDeleteConversation={handleDeleteConversation}
              onUpdateConversation={handleUpdateConversation}
            />
          </div>
        ) : (
          <div className="mt-8 text-white text-center opacity-50 select-none">
            <IconMessagesOff className='mx-auto mb-3'/>
            <span className='text-[12.5px] leading-3'>{t('No conversations.')}</span>
          </div>
        )}
      </div>

      <SidebarSettings
        lightMode={lightMode}
        apiKey={apiKey}
        conversationsCount={conversations.length}
        onToggleLightMode={onToggleLightMode}
        onApiKeyChange={onApiKeyChange}
        onClearConversations={onClearConversations}
        onExportConversations={onExportConversations}
        onImportConversations={onImportConversations}
      />
    </aside>
  );
};
