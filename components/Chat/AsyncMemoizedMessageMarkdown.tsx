import { Conversation, Message } from '@/types/chat';

import { CodeBlock } from '@/components/Markdown/CodeBlock';
import { MemoizedReactMarkdown } from '@/components/Markdown/MemoizedReactMarkdown';

import rehypeMathjax from 'rehype-mathjax';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';

const AsyncMemoizedMessageMarkdown = ({
  message,
  messageIsStreaming,
  messageIndex,
  selectedConversation,
}: {
  message: Message;
  messageIsStreaming: boolean;
  messageIndex: number;
  selectedConversation: Conversation | undefined;
}) => {
  return (
    <MemoizedReactMarkdown
      className="prose dark:prose-invert flex-1"
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeMathjax]}
      components={{
        code({ node, inline, className, children, ...props }) {
          if (children.length) {
            if (children[0] == '▍') {
              return (
                <span className="animate-pulse cursor-default mt-1">▍</span>
              );
            }

            children[0] = (children[0] as string).replace('`▍`', '▍');
          }

          const match = /language-(\w+)/.exec(className || '');

          return !inline ? (
            <CodeBlock
              key={Math.random()}
              language={(match && match[1]) || ''}
              value={String(children).replace(/\n$/, '')}
              {...props}
            />
          ) : (
            <code className={className} {...props}>
              {children}
            </code>
          );
        },
        table({ children }) {
          return (
            <table className="border-collapse border border-black px-3 py-1 dark:border-white">
              {children}
            </table>
          );
        },
        th({ children }) {
          return (
            <th className="break-words border border-black bg-gray-500 px-3 py-1 text-white dark:border-white">
              {children}
            </th>
          );
        },
        td({ children }) {
          return (
            <td className="break-words border border-black px-3 py-1 dark:border-white">
              {children}
            </td>
          );
        },
      }}
    >
      {`${message.content}${
        messageIsStreaming &&
        messageIndex == (selectedConversation?.messages.length ?? 0) - 1
          ? '`▍`'
          : ''
      }`}
    </MemoizedReactMarkdown>
  );
};

export default AsyncMemoizedMessageMarkdown;
