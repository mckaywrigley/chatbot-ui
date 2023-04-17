import { IconPlayerStop, IconRepeat, IconSend } from '@tabler/icons-react';
import {
  KeyboardEvent,
  MutableRefObject,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { useTranslation } from 'next-i18next';

import { Message } from '@/types/chat';
import { ChatMode, ChatModeID, ChatModes } from '@/types/chatmode';
import { Prompt } from '@/types/prompt';

import HomeContext from '@/pages/api/home/home.context';

import { ChatModeIcon } from '@/components/Chat/ChatModeIcon';

import { ChatModeSelect } from './ChatModeSelect';
import { ChatPluginList } from './ChatPluginList';
import { PromptList } from './PromptList';
import { VariableModal } from './VariableModal';
import styles from './chat.module.scss';

interface Props {
  onSend: (message: Message, plugin: ChatMode | null) => void;
  onRegenerate: () => void;
  stopConversationRef: MutableRefObject<boolean>;
  textareaRef: MutableRefObject<HTMLTextAreaElement | null>;
}

function ChatInputContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="stretch mx-2 mt-0 flex flex-row gap-3 last:mb-2 md:mx-4 md:mt-[6px] md:last:mb-6 lg:mx-auto lg:max-w-3xl">
      <div className="relative mx-2 flex w-full flex-grow flex-col rounded-md border border-black/10 bg-white shadow-[0_0_10px_rgba(0,0,0,0.10)] dark:border-gray-900/50 dark:bg-[#40414F] dark:text-white dark:shadow-[0_0_15px_rgba(0,0,0,0.10)] sm:mx-4">
        {children}
      </div>
    </div>
  );
}

type ChatControlPanelProps = {
  chatMode: ChatMode;
  showStopButton: boolean;
  showRegenerateButton: boolean;
  onRegenerate: () => void;
  onStopConversation: () => void;
};
function ChatControlPanel({
  chatMode,
  showStopButton,
  showRegenerateButton,
  onRegenerate,
  onStopConversation,
}: ChatControlPanelProps) {
  const { t } = useTranslation('chat');
  return (
    <div className="left-0 top-0 mx-auto px-4 bg-white text-black hover:opacity-50 dark:border-neutral-600 dark:bg-[#343541] dark:text-white md:mb-0 md:mt-2">
      <div className="w-max flex flex-col w-fit mx-auto">
        <div className="flex w-fit items-center">
          {showStopButton && (
            <ChatControlButton onClick={onStopConversation}>
              <IconPlayerStop size={16} /> {t('Stop Generating')}
            </ChatControlButton>
          )}
          {showRegenerateButton && (
            <ChatControlButton onClick={onRegenerate}>
              <IconRepeat size={16} /> {t('Regenerate response')}
            </ChatControlButton>
          )}
        </div>
      </div>
    </div>
  );
}

function ChatControlButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className="flex w-fit items-center gap-3 mb-2 py-2 rounded border border-neutral-200 bg-white px-4 text-black hover:opacity-50 dark:border-neutral-600 dark:bg-[#343541] dark:text-white md:mb-0 md:mt-2"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export const ChatInput = ({
  onSend,
  onRegenerate,
  stopConversationRef,
  textareaRef,
}: Props) => {
  const { t } = useTranslation('chat');

  const {
    state: { selectedConversation, messageIsStreaming, prompts },
    dispatch: homeDispatch,
  } = useContext(HomeContext);

  const [content, setContent] = useState<string>();
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [showPromptList, setShowPromptList] = useState(false);
  const [activePromptIndex, setActivePromptIndex] = useState(0);
  const [promptInputValue, setPromptInputValue] = useState('');
  const [variables, setVariables] = useState<string[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [showPluginSelect, setShowPluginSelect] = useState(false);
  const [chatMode, setChatMode] = useState<ChatMode>(ChatModes.direct);

  const promptListRef = useRef<HTMLUListElement | null>(null);

  const filteredPrompts = prompts.filter((prompt) =>
    prompt.name.toLowerCase().includes(promptInputValue.toLowerCase()),
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const maxLength = selectedConversation?.model.maxLength;

    if (maxLength && value.length > maxLength) {
      alert(
        t(
          `Message limit is {{maxLength}} characters. You have entered {{valueLength}} characters.`,
          { maxLength, valueLength: value.length },
        ),
      );
      return;
    }

    setContent(value);
    updatePromptListVisibility(value);
  };

  const handleSend = () => {
    if (messageIsStreaming) {
      return;
    }

    if (!content) {
      alert(t('Please enter a message'));
      return;
    }

    onSend({ role: 'user', content }, chatMode);
    setContent('');

    if (window.innerWidth < 640 && textareaRef && textareaRef.current) {
      textareaRef.current.blur();
    }
  };

  const handleStopConversation = () => {
    stopConversationRef.current = true;
    setTimeout(() => {
      stopConversationRef.current = false;
    }, 1000);
  };

  const isMobile = () => {
    const userAgent =
      typeof window.navigator === 'undefined' ? '' : navigator.userAgent;
    const mobileRegex =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i;
    return mobileRegex.test(userAgent);
  };

  const handleInitModal = () => {
    const selectedPrompt = filteredPrompts[activePromptIndex];
    if (selectedPrompt) {
      setContent((prevContent) => {
        const newContent = prevContent?.replace(
          /\/\w*$/,
          selectedPrompt.content,
        );
        return newContent;
      });
      handlePromptSelect(selectedPrompt);
    }
    setShowPromptList(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (showPromptList) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActivePromptIndex((prevIndex) =>
          prevIndex < prompts.length - 1 ? prevIndex + 1 : prevIndex,
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActivePromptIndex((prevIndex) =>
          prevIndex > 0 ? prevIndex - 1 : prevIndex,
        );
      } else if (e.key === 'Tab') {
        e.preventDefault();
        setActivePromptIndex((prevIndex) =>
          prevIndex < prompts.length - 1 ? prevIndex + 1 : 0,
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleInitModal();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowPromptList(false);
      } else {
        setActivePromptIndex(0);
      }
    } else if (e.key === 'Enter' && !isTyping && !isMobile() && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else if (e.key === '/' && e.metaKey) {
      e.preventDefault();
      setShowPluginSelect(!showPluginSelect);
    }
  };

  const parseVariables = (content: string) => {
    const regex = /{{(.*?)}}/g;
    const foundVariables = [];
    let match;

    while ((match = regex.exec(content)) !== null) {
      foundVariables.push(match[1]);
    }

    return foundVariables;
  };

  const updatePromptListVisibility = useCallback((text: string) => {
    const match = text.match(/\/\w*$/);

    if (match) {
      setShowPromptList(true);
      setPromptInputValue(match[0].slice(1));
    } else {
      setShowPromptList(false);
      setPromptInputValue('');
    }
  }, []);

  const handlePromptSelect = (prompt: Prompt) => {
    const parsedVariables = parseVariables(prompt.content);
    setVariables(parsedVariables);

    if (parsedVariables.length > 0) {
      setIsModalVisible(true);
    } else {
      setContent((prevContent) => {
        const updatedContent = prevContent?.replace(/\/\w*$/, prompt.content);
        return updatedContent;
      });
      updatePromptListVisibility(prompt.content);
    }
  };

  const handleSubmit = (updatedVariables: string[]) => {
    const newContent = content?.replace(/{{(.*?)}}/g, (match, variable) => {
      const index = variables.indexOf(variable);
      return updatedVariables[index];
    });

    setContent(newContent);

    if (textareaRef && textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  useEffect(() => {
    if (promptListRef.current) {
      promptListRef.current.scrollTop = activePromptIndex * 30;
    }
  }, [activePromptIndex]);

  useEffect(() => {
    if (textareaRef && textareaRef.current) {
      textareaRef.current.style.height = 'inherit';
      textareaRef.current.style.height = `${textareaRef.current?.scrollHeight}px`;
      textareaRef.current.style.overflow = `${
        textareaRef?.current?.scrollHeight > 400 ? 'auto' : 'hidden'
      }`;
    }
  }, [content]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        promptListRef.current &&
        !promptListRef.current.contains(e.target as Node)
      ) {
        setShowPromptList(false);
      }
    };

    window.addEventListener('click', handleOutsideClick);

    return () => {
      window.removeEventListener('click', handleOutsideClick);
    };
  }, []);

  const showStopButton = messageIsStreaming;
  const showRegenerateButton =
    !messageIsStreaming &&
    selectedConversation &&
    selectedConversation.messages.length > 0;

  return (
    <div className="absolute bottom-0 left-0 w-full border-transparent bg-gradient-to-b from-transparent via-white to-white pt-6 dark:border-white/20 dark:via-[#343541] dark:to-[#343541] md:pt-2">
      <ChatControlPanel
        chatMode={chatMode}
        showStopButton={showStopButton}
        showRegenerateButton={Boolean(showRegenerateButton)}
        onRegenerate={onRegenerate}
        onStopConversation={handleStopConversation}
      />
      {process.env.NEXT_PUBLIC_FEATURE_FLAGS_PLUGIN_SELECTOR === 'true' &&
        chatMode.id === ChatModeID.AGENT && (
          <ChatInputContainer>
            <ChatPluginList />
          </ChatInputContainer>
        )}
      <ChatInputContainer>
        <button
          className="absolute left-2 top-2 rounded-sm p-1 text-neutral-800 opacity-60 hover:bg-neutral-200 hover:text-neutral-900 dark:bg-opacity-50 dark:text-neutral-100 dark:hover:text-neutral-200"
          onClick={() => setShowPluginSelect(!showPluginSelect)}
          onKeyDown={(e) => {}}
        >
          <ChatModeIcon chatMode={chatMode} />
        </button>
        {showPluginSelect && (
          <div className="absolute left-0 bottom-14 rounded bg-white dark:bg-[#343541]">
            <ChatModeSelect
              chatMode={chatMode}
              onKeyDown={(e: any) => {
                if (e.key === 'Escape') {
                  e.preventDefault();
                  setShowPluginSelect(false);
                  textareaRef.current?.focus();
                }
              }}
              onPluginChange={(plugin: ChatMode) => {
                setChatMode(plugin);
                setShowPluginSelect(false);

                if (textareaRef && textareaRef.current) {
                  textareaRef.current.focus();
                }
              }}
            />
          </div>
        )}
        <textarea
          ref={textareaRef}
          className="m-0 w-full resize-none border-0 bg-transparent p-0 py-2 pr-8 pl-10 text-black dark:bg-transparent dark:text-white md:py-3 md:pl-10"
          style={{
            resize: 'none',
            bottom: `${textareaRef?.current?.scrollHeight}px`,
            maxHeight: '400px',
            overflow: `${
              textareaRef.current && textareaRef.current.scrollHeight > 400
                ? 'auto'
                : 'hidden'
            }`,
          }}
          placeholder={
            t('Type a message or type "/" to select a prompt...') || ''
          }
          value={content}
          rows={1}
          onCompositionStart={() => setIsTyping(true)}
          onCompositionEnd={() => setIsTyping(false)}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />
        <button
          className="absolute right-2 top-2 rounded-sm p-1 text-neutral-800 opacity-60 hover:bg-neutral-200 hover:text-neutral-900 dark:bg-opacity-50 dark:text-neutral-100 dark:hover:text-neutral-200"
          onClick={handleSend}
        >
          {messageIsStreaming ? (
            <div className="h-4 w-4 animate-spin rounded-full border-t-2 border-neutral-800 opacity-60 dark:border-neutral-100"></div>
          ) : (
            <IconSend size={18} />
          )}
        </button>
        {showPromptList && filteredPrompts.length > 0 && (
          <div className="absolute bottom-12 w-full">
            <PromptList
              activePromptIndex={activePromptIndex}
              prompts={filteredPrompts}
              onSelect={handleInitModal}
              onMouseOver={setActivePromptIndex}
              promptListRef={promptListRef}
            />
          </div>
        )}
        {isModalVisible && (
          <VariableModal
            prompt={prompts[activePromptIndex]}
            variables={variables}
            onSubmit={handleSubmit}
            onClose={() => setIsModalVisible(false)}
          />
        )}
      </ChatInputContainer>
      <div className="px-3 pt-2 pb-3 text-center text-[12px] text-black/50 dark:text-white/50 md:px-4 md:pt-3 md:pb-6">
        <a
          href="https://github.com/mckaywrigley/chatbot-ui"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          ChatBot UI
        </a>
        .{' '}
        {t(
          "Chatbot UI is an advanced chatbot kit for OpenAI's chat models aiming to mimic ChatGPT's interface and functionality.",
        )}
      </div>
    </div>
  );
};
