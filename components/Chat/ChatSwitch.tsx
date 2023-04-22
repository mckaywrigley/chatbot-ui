import {
  FC,
  memo,
  useContext,
  useMemo,
} from 'react';

import { ConversationContext } from '@/utils/contexts/conversaionContext';

import { ChatNode } from '@/types/chat';

import HomeContext from '@/pages/api/home/home.context';

interface Props {
  chatNode: ChatNode;
  messageIndex: number;
}

export const ChatSwitch: FC<Props> = memo(({ chatNode, messageIndex }) => {
  const { actions } = useContext(ConversationContext);
  const {
    state: { selectedConversation },
  } = useContext(HomeContext);

  const totalPages = useMemo(() => {
    if (!selectedConversation) return 0;
    return chatNode.parentMessageId
      ? selectedConversation.mapping[chatNode.parentMessageId].children.length
      : 0;
  }, [chatNode]);

  const currentPage = useMemo(() => {
    if (!selectedConversation) return 0;
    return (
      (chatNode.parentMessageId
        ? selectedConversation.mapping[
            chatNode.parentMessageId
          ].children.indexOf(chatNode.id)
        : 0) + 1
    );
  }, [chatNode]);
  return (
    <>
      {totalPages > 1 && (
        <div className="flex max-w-[60px] justify-between text-xs font-normal">
          <button
            disabled={currentPage == 1}
            className={(currentPage == 1 ? 'text-slate-500' : '') + ' pr-1'}
            onClick={() => actions.clickSwitchNode(messageIndex, -1)}
          >
            &lt;
          </button>
          <div>
            <span>
              {currentPage} / {totalPages}
            </span>
          </div>
          <button
            disabled={currentPage == totalPages}
            className={
              (currentPage == totalPages ? 'text-slate-500' : '') + ' pl-1'
            }
            onClick={() => actions.clickSwitchNode(messageIndex, +1)}
          >
            &gt;
          </button>
        </div>
      )}
      {
        totalPages < 1 && (
          <div>hhh</div>
        )
      }
    </>
  );
});
ChatSwitch.displayName = 'ChatSwitch';
