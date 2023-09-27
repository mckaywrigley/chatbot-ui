import { IconClearAll, IconSettings } from '@tabler/icons-react';
import {
  MutableRefObject,
  memo,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import toast from 'react-hot-toast';

import { useTranslation } from 'next-i18next';

import { saveConversation, saveConversations } from '@/utils/app/conversation';
import { throttle } from '@/utils/data/throttle';

import { ChatBody, Conversation, Message } from '@/types/chat';

import HomeContext from '@/pages/api/home/home.context';

import Spinner from '../Spinner';
import { ChatInput } from './ChatInput';
import { ChatLoader } from './ChatLoader';
import { ErrorMessageDiv } from './ErrorMessageDiv';
import { IQGPTLogo } from './IQGPTLogo';
import { MemoizedChatMessage } from './MemoizedChatMessage';
import { SystemPrompt } from './SystemPrompt';
import { TemperatureSlider } from './Temperature';

interface Props {
  stopConversationRef: MutableRefObject<boolean>;
}

export const Chat = memo(({ stopConversationRef }: Props) => {
  const { t } = useTranslation('chat');

  const {
    state: { selectedConversation, conversations, apiKey, loading, prompts },
    handleUpdateConversation,
    dispatch: homeDispatch,
  } = useContext(HomeContext);

  const [currentMessage, setCurrentMessage] = useState<Message>();
  const [autoScrollEnabled, setAutoScrollEnabled] = useState<boolean>(true);
  const [showScrollDownButton, setShowScrollDownButton] =
    useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const updateConversationMessages = (
    conversation: Conversation,
    message: Message,
    deleteCount: number,
  ) => {
    let updatedMessages = [...conversation.messages];
    if (deleteCount) {
      updatedMessages.splice(-deleteCount, deleteCount); // Remove last `deleteCount` messages
    }
    updatedMessages.push(message);
    return { ...conversation, messages: updatedMessages };
  };

  const sendApiRequest = async (
    chatBody: ChatBody,
    controller: AbortController,
  ) => {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify(chatBody),
    });
    return response;
  };

  const readAndUpdateStream = async (
    reader: ReadableStreamDefaultReader,
    decoder: TextDecoder,
    conversation: Conversation,
    controller: AbortController,
  ) => {
    let text = '';
    let isFirst = true;

    while (true) {
      if (stopConversationRef.current) {
        controller.abort();
        break;
      }

      const { value, done } = await reader.read();
      if (done) break;

      const chunkValue = decoder.decode(value);
      text += chunkValue;

      if (isFirst) {
        isFirst = false;
        const updatedMessages: Message[] = [
          ...conversation.messages,
          { role: 'assistant', content: chunkValue },
        ];
        conversation = { ...conversation, messages: updatedMessages };
        homeDispatch({ field: 'selectedConversation', value: conversation });
      } else {
        const updatedMessages = conversation.messages.map((msg, index) => {
          if (index === conversation.messages.length - 1) {
            return { ...msg, content: text };
          }
          return msg;
        });
        conversation = { ...conversation, messages: updatedMessages };
        homeDispatch({ field: 'selectedConversation', value: conversation });
      }
    }

    return conversation;
  };

  const handleUpdatedConversations = (
    allConversations: Conversation[],
    updatedConversation: Conversation,
  ) => {
    return allConversations.map((convo) => {
      if (convo.id === updatedConversation.id) return updatedConversation;
      return convo;
    });
  };

  const handleSend = useCallback(
    async (message: Message, deleteCount = 0) => {
      if (!selectedConversation) return;

      let updatedConversation = updateConversationMessages(
        selectedConversation,
        message,
        deleteCount,
      );

      homeDispatch({
        field: 'selectedConversation',
        value: updatedConversation,
      });
      homeDispatch({ field: 'loading', value: true });
      homeDispatch({ field: 'messageIsStreaming', value: true });

      const chatBody = {
        messages: updatedConversation.messages,
        prompt: updatedConversation.prompt,
        temperature: updatedConversation.temperature,
      };

      const controller = new AbortController();
      const response = await sendApiRequest(chatBody, controller);

      if (!response.ok) {
        homeDispatch({ field: 'loading', value: false });
        homeDispatch({ field: 'messageIsStreaming', value: false });
        const errorMessage = await response.text();
        toast.error(`${errorMessage}. Try Regenerate Response`);
        return;
      }

      const data = await response.body;
      if (!data) {
        homeDispatch({ field: 'loading', value: false });
        homeDispatch({ field: 'messageIsStreaming', value: false });
        return;
      }

      if (updatedConversation.messages.length === 1) {
        const { content } = message;
        const customName =
          content.length > 30 ? `${content.substring(0, 30)}...` : content;
        updatedConversation = { ...updatedConversation, name: customName };
      }

      homeDispatch({ field: 'loading', value: false });

      const reader = data.getReader();
      const decoder = new TextDecoder();
      updatedConversation = (await readAndUpdateStream(
        reader,
        decoder,
        updatedConversation,
        controller,
      )) as Conversation;

      homeDispatch({
        field: 'selectedConversation',
        value: updatedConversation,
      });

      saveConversation(updatedConversation);

      const updatedConversations = handleUpdatedConversations(
        conversations,
        updatedConversation,
      );

      if (updatedConversations.length === 0) {
        updatedConversations.push(updatedConversation);
      }

      homeDispatch({ field: 'conversations', value: updatedConversations });
      saveConversations(updatedConversations);
      homeDispatch({ field: 'messageIsStreaming', value: false });
    },
    [apiKey, conversations, selectedConversation, stopConversationRef],
  );

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
    if (
      confirm(t<string>('Are you sure you want to clear all messages?')) &&
      selectedConversation
    ) {
      handleUpdateConversation(selectedConversation, {
        key: 'messages',
        value: [],
      });
    }
  };

  const scrollDown = () => {
    if (autoScrollEnabled) {
      messagesEndRef.current?.scrollIntoView(true);
    }
  };
  const throttledScrollDown = throttle(scrollDown, 250);

  useEffect(() => {
    throttledScrollDown();
    selectedConversation &&
      setCurrentMessage(
        selectedConversation.messages[selectedConversation.messages.length - 2],
      );
  }, [selectedConversation, throttledScrollDown]);

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
    <div className="relative flex-1 overflow-hidden bg-white dark:bg-gray-800">
      <div
        className="max-h-full overflow-x-hidden"
        ref={chatContainerRef}
        onScroll={handleScroll}
      >
        {selectedConversation?.messages.length === 0 ? (
          <div className="mx-auto flex flex-col space-y-5 md:space-y-10 px-3 pt-5 md:pt-12 sm:max-w-[600px]">
            <div className="flex items-center gap-2 justify-center">
              <IQGPTLogo className="w-14 h-14 mt-1" />
              <span className="text-center text-3xl font-semibold text-gray-800 dark:text-gray-100">
                Sol IQGPT
              </span>
            </div>
            <div className="flex h-full flex-col space-y-4 rounded-lg border border-gray-200 p-4 dark:border-gray-600">
              <SystemPrompt
                conversation={selectedConversation}
                prompts={prompts}
                onChangePrompt={(prompt) =>
                  handleUpdateConversation(selectedConversation, {
                    key: 'prompt',
                    value: prompt,
                  })
                }
              />
              <TemperatureSlider
                label={t('Temperature')}
                onChangeTemperature={(temperature) =>
                  handleUpdateConversation(selectedConversation, {
                    key: 'temperature',
                    value: temperature,
                  })
                }
              />
            </div>
          </div>
        ) : (
          <>
            <div className="sticky top-0 z-10 flex justify-center border-b border-gray-300 dark:border-gray-600 bg-gray-100 py-2 text-sm text-gray-500 dark:bg-gray-700 dark:text-gray-200">
              SOL IQGPT | Temp : {selectedConversation?.temperature} |
              <button
                className="ml-2 cursor-pointer hover:opacity-50"
                onClick={onClearAll}
              >
                <IconClearAll size={18} />
              </button>
            </div>

            {selectedConversation?.messages.map((message, index) => (
              <MemoizedChatMessage
                key={index}
                message={message}
                messageIndex={index}
                onEdit={(editedMessage) => {
                  setCurrentMessage(editedMessage);
                  // discard edited message and the ones that come after then resend
                  handleSend(
                    editedMessage,
                    selectedConversation?.messages.length - index,
                  );
                }}
              />
            ))}

            {loading && <ChatLoader />}

            <div
              className="h-[162px] bg-white dark:bg-gray-800"
              ref={messagesEndRef}
            />
          </>
        )}
      </div>

      <ChatInput
        stopConversationRef={stopConversationRef}
        textareaRef={textareaRef}
        onSend={(message) => {
          setCurrentMessage(message);
          handleSend(message, 0);
        }}
        onScrollDownClick={handleScrollDown}
        onRegenerate={() => {
          if (currentMessage) {
            handleSend(currentMessage, 2);
          }
        }}
        showScrollDownButton={showScrollDownButton}
      />
    </div>
  );
});
Chat.displayName = 'Chat';
