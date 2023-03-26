import { Conversation } from '@/types/chat';
import { KeyValuePair } from '@/types/data';
import { Folder } from '@/types/folder';
import { FC } from 'react';
import { FolderComponent } from './Folder';

interface Props {
  searchTerm: string;
  conversations: Conversation[];
  folders: Folder[];
  onDeleteFolder: (folder: number) => void;
  onUpdateFolder: (folder: number, name: string) => void;
  // conversation props
  selectedConversation: Conversation;
  loading: boolean;
  onSelectConversation: (conversation: Conversation) => void;
  onDeleteConversation: (conversation: Conversation) => void;
  onUpdateConversation: (
    conversation: Conversation,
    data: KeyValuePair,
  ) => void;
}

export const Folders: FC<Props> = ({
  searchTerm,
  conversations,
  folders,
  onDeleteFolder,
  onUpdateFolder,
  // conversation props
  selectedConversation,
  loading,
  onSelectConversation,
  onDeleteConversation,
  onUpdateConversation,
}) => {
  return (
    <div className="flex w-full flex-col gap-1 pt-2">
      {folders.map((folder, index) => (
        <FolderComponent
          key={index}
          searchTerm={searchTerm}
          conversations={conversations.filter((c) => c.folderId)}
          currentFolder={folder}
          onDeleteFolder={onDeleteFolder}
          onUpdateFolder={onUpdateFolder}
          // conversation props
          selectedConversation={selectedConversation}
          loading={loading}
          onSelectConversation={onSelectConversation}
          onDeleteConversation={onDeleteConversation}
          onUpdateConversation={onUpdateConversation}
        />
      ))}
    </div>
  );
};
