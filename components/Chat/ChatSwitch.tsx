import { ChatNode } from '@/types/chat';
import {
  IconCheck,
  IconCopy,
  IconEdit,
  IconUser,
  IconRobot,
} from '@tabler/icons-react';
import { useTranslation } from 'next-i18next';
import {
  FC,
  memo,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import rehypeMathjax from 'rehype-mathjax';
import { v4 as uuidv4 } from 'uuid';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { CodeBlock } from '../Markdown/CodeBlock';
import { MemoizedReactMarkdown } from '../Markdown/MemoizedReactMarkdown';
import { ConversationContext } from '@/utils/contexts/conversaionContext';
import { getCurrentUnixTime } from '@/utils/app/chatRoomUtils';

interface Props {
  chatNode: ChatNode;
  messageIndex: number;
}

export const ChatSwitch: FC<Props> = memo(({ chatNode, messageIndex }) => {
  const { selectedConversation, actions } = useContext(ConversationContext);
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
    </>
  );
});
ChatSwitch.displayName = 'ChatSwitch';
