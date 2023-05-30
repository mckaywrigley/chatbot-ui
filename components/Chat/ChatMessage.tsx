import {
  IconCheck,
  IconCopy,
  IconEdit,
  IconRobot,
  IconTrash,
  IconUser,
} from '@tabler/icons-react';
import {
  FC,
  memo,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useTranslation } from 'next-i18next';
import Image from 'next/image';
import { event } from 'nextjs-google-analytics';

import { updateConversation } from '@/utils/app/conversation';
import { getPluginIcon } from '@/utils/app/ui';

import { Conversation, Message } from '@/types/chat';
import { PluginID } from '@/types/plugin';

import HomeContext from '@/pages/api/home/home.context';

import TokenCounter from './components/TokenCounter';

import { CodeBlock } from '../Markdown/CodeBlock';
import { MemoizedReactMarkdown } from '../Markdown/MemoizedReactMarkdown';
import { CreditCounter } from './CreditCounter';
import { FeedbackContainer } from './FeedbackContainer';
import { SpeechButton } from './SpeechButton';

import dayjs from 'dayjs';
import rehypeMathjax from 'rehype-mathjax';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';

interface Props {
  message: Message;
  messageIndex: number;
  displayFooterButtons: boolean;
  conversation: Conversation;
  onEdit?: (editedMessage: Message) => void;
}

export const ChatMessage: FC<Props> = memo(
  ({ message, displayFooterButtons, conversation, onEdit }) => {
    const { t } = useTranslation('chat');

    const {
      state: { selectedConversation, conversations },
      dispatch: homeDispatch,
    } = useContext(HomeContext);

    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [isTyping, setIsTyping] = useState<boolean>(false);
    const [messageContent, setMessageContent] = useState(message.content);
    const [messagedCopied, setMessageCopied] = useState(false);
    const [isOverTokenLimit, setIsOverTokenLimit] = useState(false);
    const [isCloseToTokenLimit, setIsCloseToTokenLimit] = useState(false);

    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const toggleEditing = () => {
      setIsEditing(!isEditing);
    };

    const handleInputChange = (
      event: React.ChangeEvent<HTMLTextAreaElement>,
    ) => {
      setMessageContent(event.target.value);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'inherit';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      }
    };

    const handleEditMessage = () => {
      if (message.content != messageContent && selectedConversation && onEdit) {
        onEdit({ ...message, content: messageContent });
      }
      setIsEditing(false);
      event('interaction', {
        category: 'Conversation',
        label: 'Edited message',
      });
    };

    const handleDeleteMessage = () => {
      if (!selectedConversation) return;

      const { messages } = selectedConversation;
      const findIndex = messages.findIndex((elm) => elm === message);

      if (findIndex < 0) return;

      if (
        findIndex < messages.length - 1 &&
        messages[findIndex + 1].role === 'assistant'
      ) {
        messages.splice(findIndex, 2);
      } else {
        messages.splice(findIndex, 1);
      }
      const updatedConversation = {
        ...selectedConversation,
        messages,
      };

      const { single, all } = updateConversation(
        updatedConversation,
        conversations,
      );
      homeDispatch({ field: 'selectedConversation', value: single });
      homeDispatch({ field: 'conversations', value: all });
    };

    const handlePressEnter = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      setIsTyping(e.nativeEvent.isComposing);
      if (e.key === 'Enter' && !isTyping && !e.shiftKey) {
        e.preventDefault();
        handleEditMessage();
      }
    };

    const copyOnClick = () => {
      if (!navigator.clipboard) return;

      navigator.clipboard.writeText(message.content).then(() => {
        setMessageCopied(true);
        setTimeout(() => {
          setMessageCopied(false);
        }, 2000);
      });
    };

    useEffect(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'inherit';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      }
    }, [isEditing]);

    const CopyButton = ({ className = '' }: { className?: string }) => {
      if (message.pluginId === PluginID.IMAGE_GEN) return <></>;

      if (messagedCopied) {
        return (
          <IconCheck
            size={20}
            className="text-green-500 dark:text-green-400 h-fit"
          />
        );
      } else {
        return (
          <button
            className={`translate-x-[1000px] text-gray-500 hover:text-gray-700 focus:translate-x-0 group-hover:translate-x-0 dark:text-gray-400 dark:hover:text-gray-300 h-fit ${className}`}
            onClick={copyOnClick}
          >
            <IconCopy size={20} />
          </button>
        );
      }
    };

    const downloadFile = async (url: string, filename: string) => {
      const response = await fetch(url);
      const blob = await response.blob();

      const href = URL.createObjectURL(blob);

      // Create a "hidden" anchor tag with the download attribute and simulate a click.
      const link = document.createElement('a');
      link.href = href;
      link.download = filename;
      link.style.display = 'none';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    const ImgComponent = useMemo(() => {
      const Component = ({
        src,
      }: React.DetailedHTMLProps<
        React.ImgHTMLAttributes<HTMLImageElement>,
        HTMLImageElement
      >) => {
        if (!src) return <></>;
        return (
          <Image
            src={src}
            alt={t('Click to download image')}
            width={512}
            height={512}
            className="cursor-pointer w-full"
            onClick={() =>
              downloadFile(
                src,
                `chateverywhere-ai-image-${dayjs().valueOf()}.png`,
              )
            }
          />
        );
      };
      Component.displayName = 'ImgComponent';
      return Component;
    }, [t]);

    const CodeComponent = useMemo(() => {
      const Component: React.FC<any> = ({
        node,
        inline,
        className,
        children,
        ...props
      }) => {
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
      };
      Component.displayName = 'CodeComponent';
      return Component;
    }, []);

    return (
      <div
        className={`group px-4 ${
          message.role === 'assistant'
            ? 'border-b border-black/10 bg-gray-50 text-gray-800 dark:border-gray-900/50 dark:bg-[#444654] dark:text-gray-100'
            : 'border-b border-black/10 bg-white text-gray-800 dark:border-gray-900/50 dark:bg-[#343541] dark:text-gray-100'
        }`}
        style={{ overflowWrap: 'anywhere' }}
      >
        <div className="relative m-auto flex gap-4 py-4 text-base md:max-w-2xl md:gap-6 md:py-6 lg:max-w-2xl lg:px-0 xl:max-w-3xl">
          <div className="min-w-[40px] text-center font-bold flex justify-center">
            {message.role === 'assistant' ? (
              message.pluginId ? (
                getPluginIcon(message.pluginId, 28)
              ) : (
                <IconRobot size={28} />
              )
            ) : (
              <IconUser size={30} />
            )}
          </div>

          <div className="prose mt-[-2px] w-full dark:prose-invert">
            {message.role === 'user' ? (
              <div className="flex w-full flex-col md:flex-row md:justify-between">
                {isEditing ? (
                  <div
                    className={`flex w-full flex-col relative ${
                      isOverTokenLimit
                        ? 'before:z-0 before:absolute before:border-2 before:border-red-500 before:dark:border-red-600 before:-top-3 before:-bottom-3 before:-inset-3'
                        : ''
                    }`}
                  >
                    <textarea
                      ref={textareaRef}
                      className="relative z-1 w-full resize-none whitespace-pre-wrap border-none dark:bg-[#343541] focus:outline-none"
                      value={messageContent}
                      onChange={handleInputChange}
                      onKeyDown={handlePressEnter}
                      onKeyUp={(e) => setIsTyping(e.nativeEvent.isComposing)}
                      onCompositionStart={() => setIsTyping(true)}
                      onCompositionEnd={() => setIsTyping(false)}
                      style={{
                        fontFamily: 'inherit',
                        fontSize: 'inherit',
                        lineHeight: 'inherit',
                        padding: '0',
                        margin: '0',
                        overflow: 'hidden',
                      }}
                    />

                    <div className="relative z-1 mt-10 flex justify-center space-x-4">
                      <button
                        className="h-[40px] rounded-md bg-blue-500 px-4 py-1 text-sm font-medium text-white enabled:hover:bg-blue-600 disabled:opacity-50"
                        onClick={handleEditMessage}
                        disabled={
                          messageContent.trim().length <= 0 || isOverTokenLimit
                        }
                      >
                        {t('Save & Submit')}
                      </button>
                      <button
                        className="h-[40px] rounded-md border border-neutral-300 px-4 py-1 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                        onClick={() => {
                          setMessageContent(message.content);
                          setIsEditing(false);
                        }}
                      >
                        {t('Cancel')}
                      </button>
                    </div>
                    <TokenCounter
                      className={` ${
                        isOverTokenLimit
                          ? '!text-red-500 dark:text-red-600'
                          : ''
                      } ${
                        isCloseToTokenLimit || isOverTokenLimit
                          ? 'visible'
                          : 'invisible'
                      } absolute right-2 bottom-2 text-sm text-neutral-500 dark:text-neutral-400`}
                      value={messageContent}
                      setIsOverLimit={setIsOverTokenLimit}
                      setIsCloseToLimit={setIsCloseToTokenLimit}
                    />
                  </div>
                ) : (
                  <div className="prose whitespace-pre-wrap dark:prose-invert">
                    {message.content}
                  </div>
                )}

                {!isEditing && (
                  <div className="flex flex-row m-1">
                    <button
                      className={`text-gray-500 hover:text-gray-700 focus:translate-x-0 group-hover:translate-x-0 dark:text-gray-400 dark:hover:text-gray-300 h-fit mr-1`}
                      onClick={toggleEditing}
                    >
                      <IconEdit size={18} fill="none" />
                    </button>
                    <button
                      className={`text-gray-500 hover:text-gray-700 focus:translate-x-0 group-hover:translate-x-0 dark:text-gray-400 dark:hover:text-gray-300 h-fit`}
                      onClick={handleDeleteMessage}
                    >
                      <IconTrash size={18} />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              // DOING: change from flex to grid
              <div className="flex w-full flex-col md:justify-between">
                <div className="flex flex-row justify-between">
                  <MemoizedReactMarkdown
                    className="prose dark:prose-invert min-w-full"
                    remarkPlugins={[remarkGfm, remarkMath, remarkBreaks]}
                    rehypePlugins={[rehypeMathjax]}
                    components={{
                      a({ node, children, href, ...props }) {
                        return (
                          <a
                            href={href}
                            target="_blank"
                            rel="noreferrer noopener"
                            {...props}
                          >
                            {children}
                          </a>
                        );
                      },
                      code: CodeComponent,
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
                      img: ImgComponent,
                    }}
                  >
                    {message.content}
                  </MemoizedReactMarkdown>
                  <div className="flex m-1 tablet:hidden">
                    <CopyButton />
                  </div>
                </div>
                <div className="flex flex-row items-center mt-3 w-full justify-between">
                  <div className="flex flex-row">
                    {message.pluginId === PluginID.GPT4 ||
                      (message.pluginId === null && (
                        <SpeechButton inputText={message.content} />
                      ))}
                    {displayFooterButtons && (
                      <>
                        <FeedbackContainer conversation={conversation} />
                        <div className="m-1 hidden tablet:flex">
                          <CopyButton className="translate-x-[unset] !text-gray-500 hover:!text-gray-300" />
                        </div>
                      </>
                    )}
                  </div>
                  {displayFooterButtons && (
                    <CreditCounter pluginId={message.pluginId} />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  },
);
ChatMessage.displayName = 'ChatMessage';
