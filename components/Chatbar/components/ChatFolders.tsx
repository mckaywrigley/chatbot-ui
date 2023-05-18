import { useContext } from 'react';
import { CSSTransition, TransitionGroup } from 'react-transition-group';

import { getNonDeletedCollection } from '@/utils/app/conversation';

import { FolderInterface } from '@/types/folder';

import HomeContext from '@/pages/api/home/home.context';

import Folder from '@/components/Folder';

import { ConversationComponent } from './Conversation';

interface Props {
  searchTerm: string;
}

export const ChatFolders = ({ searchTerm }: Props) => {
  const {
    state: { folders, conversations },
    handleUpdateConversation,
  } = useContext(HomeContext);

  const handleDrop = (e: any, folder: FolderInterface) => {
    if (e.dataTransfer) {
      const conversation = JSON.parse(e.dataTransfer.getData('conversation'));
      handleUpdateConversation(conversation, {
        key: 'folderId',
        value: folder.id,
      });
    }
  };

  const ChatFolders = (currentFolder: FolderInterface) => {
    return (
      conversations &&
      conversations
        .filter(
          (conversation) =>
            conversation.folderId && conversation.folderId === currentFolder.id,
        )
        .map((conversation, index) => (
          <div key={conversation.id} className="ml-5 gap-2 border-l pl-2 item">
            <ConversationComponent
              key={conversation.id}
              conversation={conversation}
            />
          </div>
        ))
    );
  };

  return (
    <TransitionGroup className="flex w-full flex-col pt-2">
      {getNonDeletedCollection(folders)
        .filter((folder) => folder.type === 'chat')
        .map((folder) => (
          <CSSTransition key={folder.id} timeout={500} classNames="item">
            <Folder
              key={folder.id}
              searchTerm={searchTerm}
              currentFolder={folder}
              handleDrop={handleDrop}
              folderComponent={ChatFolders(folder)}
            />
          </CSSTransition>
        ))}
    </TransitionGroup>
  );
};
