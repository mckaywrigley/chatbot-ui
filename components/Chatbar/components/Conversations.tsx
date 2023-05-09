import { CSSTransition, TransitionGroup } from 'react-transition-group';

import { Conversation } from '@/types/chat';

import { ConversationComponent } from './Conversation';

interface Props {
  conversations: Conversation[];
}

export const Conversations = ({ conversations }: Props) => {
  return (
    <div className="flex w-full flex-col gap-1">
      <TransitionGroup>
        {conversations
          .filter((conversation) => !conversation.folderId)
          .slice()
          .reverse()
          .map((conversation, index) => (
            <CSSTransition key={index} timeout={500} classNames="item">
              <ConversationComponent key={index} conversation={conversation} />
            </CSSTransition>
          ))}
      </TransitionGroup>
    </div>
  );
};
