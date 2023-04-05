import { Conversation } from '@/types/chat';
import { KeyValuePair } from '@/types/data';
import { FolderInterface, FolderType } from '@/types/folder';
import { FC } from 'react';

import Folder from '@/components/Folder';
import { ConversationComponent } from './Conversation';

interface Props {
  searchTerm: string;
  conversations: Conversation[];
  folders: FolderInterface[];
  onDeleteFolder: (folder: string) => void;
  onUpdateFolder: (folder: string, name: string) => void;
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

export const ChatFolders: FC<Props> = ({
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
  const handleDrop = (e: any, folder: FolderInterface) => {
    if (e.dataTransfer) {
      const conversation = JSON.parse(e.dataTransfer.getData('conversation'));
      onUpdateConversation(conversation, { key: 'folderId', value: folder.id });
    }
  };

  const ChatFolders = (currentFolder: FolderInterface) =>
    conversations.map((conversation, index) => {
      if (conversation.folderId === currentFolder.id) {
        return (
          <div key={index} className="ml-5 gap-2 border-l pl-2">
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
    });

  return (
    <div className="flex w-full flex-col pt-2">
      {folders.map((folder, index) => (
        <Folder
          key={index}
          searchTerm={searchTerm}
          currentFolder={folder}
          handleDrop={handleDrop}
          folderComponent={ChatFolders(folder)}
        />
      ))}
    </div>
  );
};
