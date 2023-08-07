import {
  IconClearAll,
  IconScreenshot,
  IconSettings,
  IconMarkdown,
} from '@tabler/icons-react';
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

import { getEndpoint } from '@/utils/app/api';
import { getCurrentUnixTime } from '@/utils/app/chatRoomUtils';

import {
  saveConversation,
  saveConversations,
  updateConversation,
} from '@/utils/app/conversation';
import { ConversationContext } from '@/utils/contexts/conversaionContext';
import { SendAction } from '@/types/conversation';
import { throttle } from '@/utils/data/throttle';

import { ChatBody, Conversation, Message, SendMessage, ChatNode } from '@/types/chat';
import { Plugin } from '@/types/plugin';
import { Prompt } from '@/types/prompt';

import HomeContext from '@/pages/api/home/home.context';

import CardList from '@/components/Cards/CardList';

import Spinner from '../Spinner';
import { ChatInput } from './ChatInput';
import { ChatLoader } from './ChatLoader';
import { ErrorMessageDiv } from './ErrorMessageDiv';
import { MemoizedChatMessage } from './MemoizedChatMessage';
import { ModelSelect } from './ModelSelect';
import { SystemPrompt } from './SystemPrompt';
import { TemperatureSlider } from './Temperature';

import { toPng } from 'html-to-image';

import { v4 as uuidv4 } from 'uuid';

interface Props {
  stopConversationRef: MutableRefObject<boolean>;
}

export const Chat = memo(({ stopConversationRef }: Props) => {
  const { t } = useTranslation('chat');

  const {
    state: {
      selectedConversation,
      conversations,
      models,
      apiKey,
      pluginKeys,
      serverSideApiKeyIsSet,
      messageIsStreaming,
      modelError,
      loading,
      prompts,
    },
    handleUpdateConversation,
    dispatch: homeDispatch,
  } = useContext(HomeContext);

  const [currentMessage, setCurrentMessage] = useState<ChatNode>();
  const [autoScrollEnabled, setAutoScrollEnabled] = useState<boolean>(true);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showScrollDownButton, setShowScrollDownButton] =
      useState<boolean>(false);
  const [selectedPrompt, setSelectedPrompt] = useState<any | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { currentMessageList, modifiedMessage, actions } =
      useContext(ConversationContext);

  const handleSend = useCallback(
      async (
          chatNode: ChatNode,
          sendAction: SendAction,
          messageIndex?: number,
          plugin: Plugin | null = null,
      ) => {
        if (selectedConversation) {
          let updatedConversation: Conversation;

          let sendMessages: SendMessage[];

          // regenergate
          switch (sendAction) {
            case SendAction.SEND:
              // Perform the SEND action
              actions.addMessage(chatNode);
              sendMessages = currentMessageList.map((chatNode) => {
                let { id, create_time, ...message } = chatNode.message;
                return message;
              });
              break;
            case SendAction.EDIT:
              // Perform the EDIT action
              actions.addMessage(chatNode, messageIndex);
              sendMessages = currentMessageList.map((chatNode) => {
                let { id, create_time, ...message } = chatNode.message;
                return message;
              });
              break;
            case SendAction.REGENERATE:
              // Perform the REGENERATE action
              actions.popCurrentMessageList();
              sendMessages = currentMessageList.map((chatNode) => {
                let { id, create_time, ...message } = chatNode.message;
                return message;
              });
              break;
          }

          updatedConversation = {
            ...selectedConversation,
          };

          homeDispatch({
            field: 'selectedConversation',
            value: updatedConversation,
          });
          homeDispatch({ field: 'loading', value: true });
          homeDispatch({ field: 'messageIsStreaming', value: true });
          const chatBody: ChatBody = {
            model: updatedConversation.model,
            messages: sendMessages,
            key: apiKey,
            prompt: updatedConversation.prompt,
            temperature: updatedConversation.temperature,
          };
          const endpoint = getEndpoint(plugin);
          let body;
          if (!plugin) {
            body = JSON.stringify(chatBody);
          } else {
            body = JSON.stringify({
              ...chatBody,
              googleAPIKey: pluginKeys
                  .find((key) => key.pluginId === 'google-search')
                  ?.requiredKeys.find((key) => key.key === 'GOOGLE_API_KEY')?.value,
              googleCSEId: pluginKeys
                  .find((key) => key.pluginId === 'google-search')
                  ?.requiredKeys.find((key) => key.key === 'GOOGLE_CSE_ID')?.value,
            });
          }
          const controller = new AbortController();
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            signal: controller.signal,
            body,
          });
          if (!response.ok) {
            homeDispatch({ field: 'loading', value: false });
            homeDispatch({ field: 'messageIsStreaming', value: false });
            toast.error(response.statusText);
            return;
          }
          const data = response.body;
          if (!data) {
            homeDispatch({ field: 'loading', value: false });
            homeDispatch({ field: 'messageIsStreaming', value: false });
            return;
          }
          const nodeId = uuidv4();
          const currentTime = getCurrentUnixTime();
          updatedConversation = {
            ...selectedConversation,
          };

          if (!plugin) {
            if (currentMessageList.length === 1) {
              const { content } = currentMessageList[0].message;
              const customName =
                  content.length > 30 ? content.substring(0, 30) + '...' : content;
              updatedConversation = {
                ...updatedConversation,
                name: customName,
              };
            }
            homeDispatch({ field: 'loading', value: false });

            let responseNode: ChatNode = {
              id: nodeId,
              message: {
                id: nodeId,
                role: 'assistant',
                content: '',
                create_time: currentTime,
              },
              children: [],
              parentMessageId: chatNode.id,
            };

            updatedConversation.current_node = responseNode.id;
            actions.addMessage(responseNode);

            const reader = data.getReader();
            const decoder = new TextDecoder();
            let done = false;
            let isFirst = true;
            let text = '';

            while (!done) {
              if (stopConversationRef.current === true) {
                controller.abort();
                done = true;
                break;
              }
              const { value, done: doneReading } = await reader.read();
              done = doneReading;
              const chunkValue = decoder.decode(value);
              text += chunkValue;

              // Update the chatNode in the selectedConversation
              let updateChatNode: ChatNode = {
                id: nodeId,
                message: {
                  id: nodeId,
                  role: 'assistant',
                  content: text,
                  create_time: currentTime,
                },
                children: [],
                parentMessageId: chatNode.id,
              };

              updatedConversation = {
                ...updatedConversation,
                mapping: {
                  ...updatedConversation?.mapping,
                  [updateChatNode.id]: updateChatNode,
                },
                current_node: updateChatNode.id,
              };

              modifiedMessage(updateChatNode);
            }
            saveConversation(updatedConversation);
            const updatedConversations: Conversation[] = conversations.map(
                (conversation) => {
                  if (conversation.id === selectedConversation.id) {
                    return updatedConversation;
                  }
                  return conversation;
                },
            );
            if (updatedConversations.length === 0) {
              updatedConversations.push(updatedConversation);
            }
            homeDispatch({ field: 'conversations', value: updatedConversations });
            saveConversations(updatedConversations);
            homeDispatch({ field: 'messageIsStreaming', value: false });
          } else {
            const { answer } = await response.json();

            let updateChatNode: ChatNode = {
              id: nodeId,
              message: {
                id: nodeId,
                role: 'assistant',
                content: answer,
                create_time: currentTime,
              },
              children: [],
              parentMessageId: chatNode.id,
            };

            updatedConversation = {
              ...updatedConversation,
              mapping: {
                ...updatedConversation?.mapping,
                [updateChatNode.id]: updateChatNode,
              },
              current_node: updateChatNode.id,
            };

            homeDispatch({
              field: 'selectedConversation',
              value: updatedConversation,
            });
            saveConversation(updatedConversation);
            const updatedConversations: Conversation[] = conversations.map(
                (conversation) => {
                  if (conversation.id === selectedConversation.id) {
                    return updatedConversation;
                  }
                  return conversation;
                },
            );
            if (updatedConversations.length === 0) {
              updatedConversations.push(updatedConversation);
            }
            homeDispatch({ field: 'conversations', value: updatedConversations });
            saveConversations(updatedConversations);
            homeDispatch({ field: 'loading', value: false });
            homeDispatch({ field: 'messageIsStreaming', value: false });
          }
        }
      },
      [
        apiKey,
        conversations,
        pluginKeys,
        selectedConversation,
        stopConversationRef,
      ],
  );

  const scrollToBottom = useCallback(() => {
    if (autoScrollEnabled) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      textareaRef.current?.focus();
    }
  }, [autoScrollEnabled]);

  const handlePromptSelect = (prompt: any) => {
    setSelectedPrompt(prompt); // Update the selectedPrompt state with the selected prompt
  };

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

  const handleSettings = () => {
    setShowSettings(!showSettings);
  };

  const onClearAll = () => {
    if (
        confirm(t<string>('Are you sure you want to clear all messages?')) &&
        selectedConversation
    ) {
      let systemNode = selectedConversation.mapping[selectedConversation.id];
      let updatedConversation = {
        ...selectedConversation,
      };
      updatedConversation.current_node = systemNode.id;
      updatedConversation.mapping = {
        [systemNode.id]: {
          ...systemNode,
        },
      };
      homeDispatch({
        field: 'selectedConversation',
        value: updatedConversation,
      });
      updateConversation(updatedConversation, conversations)
    }
  };

  const scrollDown = () => {
    if (autoScrollEnabled) {
      messagesEndRef.current?.scrollIntoView(true);
    }
  };
  const throttledScrollDown = throttle(scrollDown, 250);

  const onMarkdown = () => {
    let markdownContent = '';

    currentMessageList.forEach(obj => {
      markdownContent += `## ${obj.message.role === "user" ? t('You') : t("AI")}\n\n${obj.message.content}\n\n`;
    });

    const date = new Date().toLocaleString("default", { year: "numeric", month: "long", day: "numeric" })
    const time = new Date().toLocaleTimeString("default", {hour12: true, hour: "numeric", minute: "numeric"})

    markdownContent += `---\n`
    markdownContent += `${t("Exported on")} ` + date + ` ${t("at")} ` + time + ".";

    const markdownFile = new Blob([markdownContent], { type: 'text/markdown' });
    const downloadLink = document.createElement('a');

    downloadLink.href = URL.createObjectURL(markdownFile);
    downloadLink.download = `${selectedConversation?.name || 'conversation'}.md`;
    downloadLink.click();
  }

  const onScreenshot = () => {
    if (chatContainerRef.current === null) {
      return;
    }

    chatContainerRef.current.classList.remove('max-h-full');
    toPng(chatContainerRef.current, { cacheBust: true })
        .then((dataUrl) => {
          const link = document.createElement('a');
          link.download = `${selectedConversation?.name || 'conversation'}.png`;
          link.href = dataUrl;
          link.click();
          if (chatContainerRef.current) {
            chatContainerRef.current.classList.add('max-h-full');
          }
        })
        .catch((err) => {
          console.log(err);
        });
  };

  // useEffect(() => {
  //   console.log('currentMessage', currentMessage);
  //   if (currentMessage) {
  //     handleSend(currentMessage);
  //     homeDispatch({ field: 'currentMessage', value: undefined });
  //   }
  // }, [currentMessage]);

  useEffect(() => {
    throttledScrollDown();
    // selectedConversation &&
    //   setCurrentMessage(
    //     currentMessageList[currentMessageList.length - 2],
    //   );
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
      <div className="relative flex-1 overflow-hidden bg-white dark:bg-[#343541]">
        {!(apiKey || serverSideApiKeyIsSet) ? (
            <div className="mx-auto flex h-full w-[300px] flex-col justify-center space-y-6 sm:w-[600px]">
              <div className="text-center text-4xl font-bold text-black dark:text-white">
                Welcome to Chatbot UI
              </div>
              <div className="text-center text-lg text-black dark:text-white">
                <div className="mb-8">{`Chatbot UI is an open source clone of OpenAI's ChatGPT UI.`}</div>
                <div className="mb-2 font-bold">
                  Important: Chatbot UI is 100% unaffiliated with OpenAI.
                </div>
              </div>
              <div className="text-center text-gray-500 dark:text-gray-400">
                <div className="mb-2">
                  Chatbot UI allows you to plug in your API key to use this UI with
                  their API.
                </div>
                <div className="mb-2">
                  It is <span className="italic">only</span> used to communicate
                  with their API.
                </div>
                <div className="mb-2">
                  {t(
                      'Please set your OpenAI API key in the bottom left of the sidebar.',
                  )}
                </div>
                <div>
                  {t("If you don't have an OpenAI API key, you can get one here: ")}
                  <a
                      href="https://platform.openai.com/account/api-keys"
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-500 hover:underline"
                  >
                    openai.com
                  </a>
                </div>
              </div>
            </div>
        ) : modelError ? (
            <ErrorMessageDiv error={modelError} />
        ) : (
            <>
              <div
                  className="max-h-full overflow-x-hidden"
                  ref={chatContainerRef}
                  onScroll={handleScroll}
              >
                <div className="sticky top-0 z-10 flex justify-center border border-b-neutral-300 bg-neutral-100 py-2 text-sm text-neutral-500 dark:border-none dark:bg-[#444654] dark:text-neutral-200">
                  {t('Model')}: {selectedConversation?.model.name} | {t('Temp')}:{' '}
                  {selectedConversation?.temperature} |
                  <button
                      className="ml-2 cursor-pointer hover:opacity-50"
                      onClick={handleSettings}
                  >
                    <IconSettings size={18} />
                  </button>
                  <button
                      className="ml-2 cursor-pointer hover:opacity-50 disabled:hidden"
                      onClick={onClearAll}
                      disabled={currentMessageList.length === 0}
                  >
                    <IconClearAll size={18} />
                  </button>

                  <button
                      className="ml-2 cursor-pointer hover:opacity-50"
                      onClick={onScreenshot}
                  >
                    <IconScreenshot size={18} />
                  </button>

                  <button
                    className="ml-2 cursor-pointer hover:opacity-50"
                    onClick={onMarkdown}
                  >
                    <IconMarkdown size={18} />
                  </button>
                </div>
                {showSettings && selectedConversation && (
                    <div className="mx-auto flex flex-col space-y-5 md:space-y-10 px-3 pt-5 md:pt-12 sm:max-w-[600px]">
                      {models.length === 0 && (
                          <div className="text-center text-3xl font-semibold text-gray-800 dark:text-gray-100">
                            <div>
                              <Spinner size="16px" className="mx-auto" />
                            </div>
                          </div>
                      )}

                      {models.length > 0 && (
                          <div className="flex h-full flex-col space-y-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-600">
                            <ModelSelect />

                            <SystemPrompt
                                conversation={selectedConversation!}
                                prompts={prompts}
                                onChangePrompt={(prompt) =>
                                    handleUpdateConversation(selectedConversation!, {
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
                      )}
                    </div>
                )}
                {currentMessageList.length === 0 ? (
                    <>
                      <div className="container mx-auto px-3 pt-5 pb-36 md:pt-12 sm:max-w-[700px]">
                        <CardList
                            cards={prompts}
                            handlePromptSelect={handlePromptSelect}
                        />
                      </div>
                    </>
                ) : (
                    <>
                      {currentMessageList?.map((message, index) => (
                          <MemoizedChatMessage
                              key={message.id}
                              chatNode={message}
                              messageIndex={index}
                              onEdit={(editedMessage) => {
                                setCurrentMessage(editedMessage);
                                // discard edited message and the ones that come after then resend
                                handleSend(
                                    editedMessage,
                                    SendAction.EDIT,
                                    index,
                                    // currentMessageList?.length - index,
                                );
                              }}
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
                  selectedPrompt={selectedPrompt}
                  onSend={(message, plugin) => {
                    setCurrentMessage(message);
                    handleSend(message, SendAction.SEND, undefined, plugin);
                  }}
                  onScrollDownClick={handleScrollDown}
                  onRegenerate={() => {
                    if (currentMessage) {
                      handleSend(currentMessage, SendAction.REGENERATE, undefined);
                    }
                  }}
                  showScrollDownButton={showScrollDownButton}
              />
            </>
        )}
      </div>
  );
});
Chat.displayName = 'Chat';
