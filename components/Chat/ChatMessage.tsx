import {
  IconCheck,
  IconCopy,
  IconEdit,
  IconRobot,
  IconTrash,
  IconUser,
} from '@tabler/icons-react';
import { FC, memo, useContext, useEffect, useRef, useState } from 'react';

import { useTranslation } from 'next-i18next';

import { getCurrentUnixTime } from '@/utils/app/chatRoomUtils';
import { updateConversation } from '@/utils/app/conversation';
import { ConversationContext } from '@/utils/contexts/conversaionContext';

import { ChatNode } from '@/types/chat';
import { Message } from '@/types/chat';

import HomeContext from '@/pages/api/home/home.context';

import { CodeBlock } from '../Markdown/CodeBlock';
import { MemoizedReactMarkdown } from '../Markdown/MemoizedReactMarkdown';

import { ChatSwitch } from './ChatSwitch';

import rehypeMathjax from 'rehype-mathjax';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { v4 as uuidv4 } from 'uuid';

export interface Props {
  // message: Message;
  chatNode: ChatNode;
  messageIndex: number;
  onEdit?: (editedMessage: ChatNode) => void;
}

export const ChatMessage: FC<Props> = memo(
  ({ chatNode, messageIndex, onEdit }) => {
    const { t } = useTranslation('chat');

    const {
      state: {
        selectedConversation,
        conversations,
        currentMessage,
        messageIsStreaming,
      },
      dispatch: homeDispatch,
    } = useContext(HomeContext);
    // >>>>>>> upstream/main

    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [isTyping, setIsTyping] = useState<boolean>(false);
    const [messageContent, setMessageContent] = useState(
      chatNode.message.content,
    );
    const [isHoverMessage, setIsHoverMessage] = useState<boolean>(false);
    const [messagedCopied, setMessageCopied] = useState(false);

    const { currentMessageList } = useContext(ConversationContext);
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
      if (chatNode.message.content != messageContent) {
        if (selectedConversation && onEdit) {
          const nodeId = uuidv4();
          onEdit({
            id: nodeId,
            message: {
              id: nodeId,
              role: chatNode.message.role,
              content: messageContent,
              create_time: getCurrentUnixTime(),
            },
            parentMessageId: chatNode.parentMessageId,
            children: [],
          });
        }
      }
      setIsEditing(false);
    };

    // const handleDeleteMessage = () => {
    //   if (!selectedConversation) return;

    //   const { messages } = selectedConversation;
    //   const findIndex = messages.findIndex((elm) => elm === message);

    //   if (findIndex < 0) return;

    //   if (
    //     findIndex < messages.length - 1 &&
    //     messages[findIndex + 1].role === 'assistant'
    //   ) {
    //     messages.splice(findIndex, 2);
    //   } else {
    //     messages.splice(findIndex, 1);
    //   }
    //   const updatedConversation = {
    //     ...selectedConversation,
    //     messages,
    //   };

    //   const { single, all } = updateConversation(
    //     updatedConversation,
    //     conversations,
    //   );
    //   homeDispatch({ field: 'selectedConversation', value: single });
    //   homeDispatch({ field: 'conversations', value: all });
    // };

    const handlePressEnter = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !isTyping && !e.shiftKey) {
        e.preventDefault();
        handleEditMessage();
      }
    };

    const copyOnClick = () => {
      if (!navigator.clipboard) return;

      navigator.clipboard.writeText(chatNode.message.content).then(() => {
        setMessageCopied(true);
        setTimeout(() => {
          setMessageCopied(false);
        }, 2000);
      });
    };

    useEffect(() => {
      setMessageContent(chatNode.message.content);
    }, [chatNode.message.content]);

    useEffect(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'inherit';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      }
    }, [isEditing]);

    return (
      <div
        className={`group md:px-4 ${
          chatNode.message.role === 'assistant'
            ? 'border-b border-black/10 bg-gray-50 text-gray-800 dark:border-gray-900/50 dark:bg-[#444654] dark:text-gray-100'
            : 'border-b border-black/10 bg-white text-gray-800 dark:border-gray-900/50 dark:bg-[#343541] dark:text-gray-100'
        }`}
        style={{ overflowWrap: 'anywhere' }}
        onMouseEnter={() => setIsHoverMessage(true)}
        onMouseLeave={() => setIsHoverMessage(false)}
      >
        <div className="relative m-auto flex p-4 text-base md:max-w-2xl md:gap-6 md:py-6 lg:max-w-2xl lg:px-0 xl:max-w-3xl">
          <div className="flex min-w-[40px] text-right font-bold">
            <div className="absolute left-0 hidden self-center md:-ml-10 lg:-ml-16 lg:flex">
              <ChatSwitch
                key={chatNode.id}
                chatNode={chatNode}
                messageIndex={messageIndex}
              />
            </div>
            <div className="flex justify-center">
              {chatNode.message.role === 'assistant' ? (
                <IconRobot size={30} />
              ) : (
                <IconUser size={30} />
              )}
            </div>
          </div>

          <div className="prose mt-[-2px] w-full dark:prose-invert">
            {chatNode.message.role === 'user' ? (
              <div className="flex w-full">
                {isEditing ? (
                  <div className="flex w-full flex-col">
                    <textarea
                      ref={textareaRef}
                      className="w-full resize-none whitespace-pre-wrap border-none dark:bg-[#343541]"
                      value={messageContent}
                      onChange={handleInputChange}
                      onKeyDown={handlePressEnter}
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

                    <div className="mt-10 flex justify-center space-x-4">
                      <button
                        className="h-[40px] rounded-md bg-blue-500 px-4 py-1 text-sm font-medium text-white enabled:hover:bg-blue-600 disabled:opacity-50"
                        onClick={handleEditMessage}
                        disabled={messageContent.trim().length <= 0}
                      >
                        {t('Save & Submit')}
                      </button>
                      <button
                        className="h-[40px] rounded-md border border-neutral-300 px-4 py-1 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                        onClick={() => {
                          setMessageContent(chatNode.message.content);
                          setIsEditing(false);
                        }}
                      >
                        {t('Cancel')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex w-full flex-col content-around lg:flex-row">
                    <div className="prose whitespace-pre-wrap dark:prose-invert lg:flex-grow">
                      {chatNode.message.content}
                    </div>
                    <div className="flex justify-between pt-3 lg:pt-0">
                      <span className="lg:hidden">
                        <ChatSwitch
                          key={chatNode.id}
                          chatNode={chatNode}
                          messageIndex={messageIndex}
                        />
                      </span>
                    </div>
                  </div>
                )}

                {!isEditing && (
                  <div className="md:-mr-8 ml-1 md:ml-0 flex flex-col md:flex-row gap-4 md:gap-1 items-center md:items-start justify-end md:justify-start">
                    <button
                      className="invisible group-hover:visible focus:visible text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                      onClick={toggleEditing}
                    >
                      <IconEdit size={20} />
                    </button>
                    {/* <button
                      className="invisible group-hover:visible focus:visible text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                      onClick={handleDeleteMessage}
                    >
                      <IconTrash size={20} />
                    </button> */}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex w-full">
                <div className="flex w-full flex-col content-around lg:flex-row">
                  <MemoizedReactMarkdown
                    className="prose dark:prose-invert lg:flex-grow"
                    // className="prose dark:prose-invert flex-1"
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeMathjax]}
                    components={{
                      code({ node, inline, className, children, ...props }) {
                        if (children.length) {
                          if (children[0] == '▍') {
                            return (
                              <span className="animate-pulse cursor-default mt-1">
                                ▍
                              </span>
                            );
                          }

                          children[0] = (children[0] as string).replace(
                            '`▍`',
                            '▍',
                          );
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
                    {`${chatNode.message.content}${
                      messageIsStreaming &&
                      messageIndex == (currentMessageList?.length ?? 0) - 1
                        ? '`▍`'
                        : ''
                    }`}
                  </MemoizedReactMarkdown>
                  <div className="flex justify-between pt-3 lg:pt-0">
                    <span className="lg:hidden">
                      <ChatSwitch
                        key={chatNode.id}
                        chatNode={chatNode}
                        messageIndex={messageIndex}
                      />
                    </span>
                  </div>
                </div>
                <div className="md:-mr-8 ml-1 md:ml-0 flex flex-col md:flex-row gap-4 md:gap-1 items-center md:items-start justify-end md:justify-start">
                  {messagedCopied ? (
                    <IconCheck
                      size={20}
                      className="text-green-500 dark:text-green-400"
                    />
                  ) : (
                    <button
                      className="invisible group-hover:visible focus:visible text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                      onClick={copyOnClick}
                    >
                      <IconCopy size={20} />
                    </button>
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
