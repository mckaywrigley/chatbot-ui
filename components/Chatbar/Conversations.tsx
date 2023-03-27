import { Conversation } from '@/types/chat';
import { KeyValuePair } from '@/types/data';
import { FC } from 'react';
import { ConversationComponent } from './Conversation';

interface Props {
  loading: boolean;
  conversations: Conversation[];
  selectedConversation: Conversation;
  onSelectConversation: (conversation: Conversation) => void;
  onDeleteConversation: (conversation: Conversation) => void;
  onUpdateConversation: (
    conversation: Conversation,
    data: KeyValuePair,
  ) => void;
}

export const Conversations: FC<Props> = ({
  loading,
  conversations,
  selectedConversation,
  onSelectConversation,
  onDeleteConversation,
  onUpdateConversation,
}) => {
  return (
    <div className="flex w-full flex-col gap-1">
      {conversations
        .slice()
        .reverse()
        .map((conversation, index) => (
          <ConversationComponent
            key={index}
            selectedConversation={selectedConversation}
            conversation={conversation}
            loading={loading}
            onSelectConversation={onSelectConversation}
            onDeleteConversation={onDeleteConversation}
            onUpdateConversation={onUpdateConversation}
          />
        ))}
    </div>
  );
};
