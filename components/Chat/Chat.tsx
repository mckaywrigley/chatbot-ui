import { Conversation, Message } from '@/types/chat';
import { KeyValuePair } from '@/types/data';
import { ErrorMessage } from '@/types/error';
import { OpenAIModel, OpenAIModelID } from '@/types/openai';
import { Prompt } from '@/types/prompt';
import { throttle } from '@/utils';
import { IconArrowDown, IconClearAll } from '@tabler/icons-react';
import { useTranslation } from 'next-i18next';
import { FC, memo, MutableRefObject, useEffect, useRef, useState } from 'react';
import { Spinner } from '../Global/Spinner';
import { ChatInput } from './ChatInput';
import { ChatLoader } from './ChatLoader';
import { ChatMessage } from './ChatMessage';
import { ErrorMessageDiv } from './ErrorMessageDiv';
import { event } from 'nextjs-google-analytics';
import { NewConversationMessagesContainer } from './NewConversationMessagesContainer';

interface Props {
  conversation: Conversation;
  models: OpenAIModel[];
  apiKey: string;
  serverSideApiKeyIsSet: boolean;
  defaultModelId: OpenAIModelID;
  messageIsStreaming: boolean;
  modelError: ErrorMessage | null;
  loading: boolean;
  prompts: Prompt[];
  onSend: (message: Message, deleteCount?: number) => void;
  onUpdateConversation: (
    conversation: Conversation,
    data: KeyValuePair,
  ) => void;
  onEditMessage: (message: Message, messageIndex: number) => void;
  stopConversationRef: MutableRefObject<boolean>;
}

export const Chat: FC<Props> = memo(
  ({
    conversation,
    models,
    messageIsStreaming,
    modelError,
    loading,
    prompts,
    onSend,
    onUpdateConversation,
    onEditMessage,
    stopConversationRef,
  }) => {
    const { t } = useTranslation('chat');
    const [currentMessage, setCurrentMessage] = useState<Message>();
    const [autoScrollEnabled, setAutoScrollEnabled] = useState<boolean>(true);
    const [showScrollDownButton, setShowScrollDownButton] =
      useState<boolean>(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleScroll = () => {
      if (chatContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } =
          chatContainerRef.current;
        const bottomTolerance = 30;

        if (scrollTop + clientHeight < scrollHeight - bottomTolerance) {
          setAutoScrollEnabled(false);
          setShowScrollDownButton(true);
        } else {
          setAutoScrollEnabled(true);
          setShowScrollDownButton(false);
        }
      }
    };

    const handleScrollDown = () => {
      chatContainerRef.current?.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    };

    const onClearAll = () => {
      if (confirm(t<string>('Are you sure you want to clear all messages?'))) {
        onUpdateConversation(conversation, { key: 'messages', value: [] });
      }
    };

    const scrollDown = () => {
      if (autoScrollEnabled) {
        messagesEndRef.current?.scrollIntoView(true);
      }
    };
    const throttledScrollDown = throttle(scrollDown, 250);

    // appear scroll down button only when user scrolls up

    useEffect(() => {
      throttledScrollDown();
      setCurrentMessage(
        conversation.messages[conversation.messages.length - 2],
      );
    }, [conversation.messages, throttledScrollDown]);

    useEffect(() => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          setAutoScrollEnabled(entry.isIntersecting);
          if (entry.isIntersecting) {
            textareaRef.current?.focus();
          }
        },
        {
          root: null,
          threshold: 0.5,
        },
      );
      const messagesEndElement = messagesEndRef.current;
      if (messagesEndElement) {
        observer.observe(messagesEndElement);
      }
      return () => {
        if (messagesEndElement) {
          observer.unobserve(messagesEndElement);
        }
      };
    }, [messagesEndRef]);

    return (
      <div className="relative flex-1 overflow-hidden bg-white dark:bg-[#343541]">
        {modelError ? (
          <ErrorMessageDiv error={modelError} />
        ) : (
          <>
            <div
              className="max-h-full overflow-x-hidden"
              ref={chatContainerRef}
              onScroll={handleScroll}
            >
              {conversation.messages.length === 0 ? (
                <>
                  <div className="mx-auto flex w-[350px] flex-col space-y-10 pt-12 sm:w-[600px]">
                    <div className="text-center text-3xl text-gray-800 dark:text-gray-100">
                      {models.length === 0 ? (
                        <div>
                          <Spinner size="16px" className="mx-auto" />
                        </div>
                      ) : (
                        <NewConversationMessagesContainer />
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-center border border-b-neutral-300 bg-neutral-100 py-2 text-sm text-neutral-500 dark:border-none dark:bg-[#444654] dark:text-neutral-200">
                    {conversation.name}
                    <button
                      className="ml-2 cursor-pointer hover:opacity-50"
                      onClick={onClearAll}
                    >
                      <IconClearAll size={18} />
                    </button>
                  </div>

                  {conversation.messages.map((message, index) => (
                    <ChatMessage
                      key={index}
                      message={message}
                      messageIndex={index}
                      onEditMessage={onEditMessage}
                    />
                  ))}

                  {loading && <ChatLoader />}

                  <div
                    className="h-[162px] bg-white dark:bg-[#343541]"
                    ref={messagesEndRef}
                  />
                </>
              )}
            </div>

            <ChatInput
              stopConversationRef={stopConversationRef}
              textareaRef={textareaRef}
              messageIsStreaming={messageIsStreaming}
              conversationIsEmpty={conversation.messages.length === 0}
              messages={conversation.messages}
              model={conversation.model}
              prompts={prompts}
              onSend={(message) => {
                setCurrentMessage(message);
                onSend(message);
              }}
              onRegenerate={() => {
                if (currentMessage) {
                  onSend(currentMessage, 2);

                  event('interaction', {
                    category: 'Chat',
                    label: 'Regenerate Message',
                  });
                }
              }}
            />
          </>
        )}
        {showScrollDownButton && (
          <div className="absolute bottom-0 right-0 mb-4 mr-4 pb-20">
            <button
              className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-200 text-gray-700 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-200"
              onClick={handleScrollDown}
            >
              <IconArrowDown size={18} />
            </button>
          </div>
        )}
      </div>
    );
  },
);
Chat.displayName = 'Chat';
