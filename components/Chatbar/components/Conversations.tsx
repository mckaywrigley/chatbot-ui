import { useState } from 'react';
import { CSSTransition, TransitionGroup } from 'react-transition-group';

import { Conversation } from '@/types/chat';

import { ConversationComponent } from './Conversation';

interface Props {
  conversations: Conversation[];
}

export const Conversations = ({ conversations }: Props) => {
  return (
    <TransitionGroup className="flex w-full gap-1 flex-col-reverse">
      {conversations
        .filter((conversation) => !conversation.folderId)
        .map((conversation) => (
          <CSSTransition
            key={`transition-${conversation.id}`}
            timeout={500}
            classNames="item"
          >
            <ConversationComponent conversation={conversation} />
          </CSSTransition>
        ))}
    </TransitionGroup>
  );
};
