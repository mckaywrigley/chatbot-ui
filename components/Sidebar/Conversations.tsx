import { Conversation, KeyValuePair } from "@/types";
import { FC } from "react";
import { ConversationComponent } from "./Conversation";

interface Props {
  loading: boolean;
  conversations: Conversation[];
  selectedConversation: Conversation;
  onSelectConversation: (conversation: Conversation) => void;
  onDeleteConversation: (conversation: Conversation) => void;
  onUpdateConversation: (conversation: Conversation, data: KeyValuePair) => void;
}

export const Conversations: FC<Props> = ({ loading, conversations, selectedConversation, onSelectConversation, onDeleteConversation, onUpdateConversation }) => {
  return (
    <div className="flex flex-col gap-1 w-full pt-2">
      {conversations.slice().reverse().map((conversation, index) => (
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
