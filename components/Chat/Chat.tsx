import { Conversation, KeyValuePair, Message, OpenAIModel } from "@/types";
import { FC, MutableRefObject, useEffect, useRef, useState } from "react";
import { ChatInput } from "./ChatInput";
import { ChatLoader } from "./ChatLoader";
import { ChatMessage } from "./ChatMessage";
import { ModelSelect } from "./ModelSelect";
import { Regenerate } from "./Regenerate";
import { SystemPrompt } from "./SystemPrompt";

interface Props {
  conversation: Conversation;
  models: OpenAIModel[];
  apiKey: string;
  messageIsStreaming: boolean;
  modelError: boolean;
  messageError: boolean;
  loading: boolean;
  lightMode: "light" | "dark";
  onSend: (message: Message, isResend: boolean) => void;
  onUpdateConversation: (conversation: Conversation, data: KeyValuePair) => void;
  stopConversationRef: MutableRefObject<boolean>;
}

export const Chat: FC<Props> = ({ conversation, models, apiKey, messageIsStreaming, modelError, messageError, loading, lightMode, onSend, onUpdateConversation, stopConversationRef }) => {
  const [currentMessage, setCurrentMessage] = useState<Message>();
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      const bottomTolerance = 30;

      if (scrollTop + clientHeight < scrollHeight - bottomTolerance) {
        setAutoScrollEnabled(false);
      } else {
        setAutoScrollEnabled(true);
      }
    }
  };

  useEffect(() => {
    const scrollToBottom = () => {
      if (autoScrollEnabled) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };
    scrollToBottom();
  }, [conversation.messages, autoScrollEnabled]);

  useEffect(() => {
    const chatContainer = chatContainerRef.current;

    if (chatContainer) {
      chatContainer.addEventListener("scroll", handleScroll);

      return () => {
        chatContainer.removeEventListener("scroll", handleScroll);
      };
    }
  }, []);

  return (
    <section className="relative flex-1 overflow-none dark:bg-[#343541] bg-white">
      {!apiKey && (
        <div className="flex flex-col justify-center mx-auto h-full w-[300px] sm:w-[500px] space-y-6 text-center">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">OpenAI API Key Required</h2>
          <p className="text-gray-500 dark:text-gray-400">Please set your OpenAI API key in the bottom left of the sidebar.</p>
        </div>
      )}

      {modelError ? (
        <div className="flex flex-col justify-center mx-auto h-full w-[300px] sm:w-[500px] space-y-6 text-center text-red-500">
          <h3>Error fetching models.</h3>
          <p>Make sure your OpenAI API key is set in the bottom left of the sidebar or in a .env.local file and refresh.</p>
          <p>If you completed this step, OpenAI may be experiencing issues.</p>
        </div>
      ) : (
        <>
          <div
            className="overflow-auto h-full"
            ref={chatContainerRef}
          >
            {conversation.messages.length === 0 ? (
              <>
                <div className="flex flex-col mx-auto pt-12 space-y-10 w-[350px] sm:w-[600px]">
                  <div className="text-4xl font-semibold text-center text-gray-800 dark:text-gray-100">{models.length === 0 ? "Loading..." : "Chatbot UI"}</div>

                  {models.length > 0 && (
                    <div className="flex flex-col h-full space-y-4 border p-4 rounded border-neutral-500">
                      <ModelSelect
                        model={conversation.model}
                        models={models}
                        onModelChange={(model) => onUpdateConversation(conversation, { key: "model", value: model })}
                      />

                      <SystemPrompt
                        conversation={conversation}
                        onChangePrompt={(prompt) => onUpdateConversation(conversation, { key: "prompt", value: prompt })}
                      />
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-center py-2 text-neutral-500 bg-neutral-100 dark:bg-[#444654] dark:text-neutral-200 text-sm border border-b-neutral-300 dark:border-none">Model: {conversation.model.name}</div>

                {conversation.messages.map((message, index) => (
                  <ChatMessage
                    key={index}
                    message={message}
                    lightMode={lightMode}
                  />
                ))}

                {loading && <ChatLoader />}

                <div
                  className="bg-white dark:bg-[#343541] h-[162px]"
                  ref={messagesEndRef}
                />
              </>
            )}
          </div>

          {messageError ? (
            <Regenerate
              onRegenerate={() => {
                if (currentMessage) {
                  onSend(currentMessage, true);
                }
              }}
            />
          ) : (
            <ChatInput
              stopConversationRef={stopConversationRef}
              messageIsStreaming={messageIsStreaming}
              onSend={(message) => {
                setCurrentMessage(message);
                onSend(message, false);
              }}
              model={conversation.model}
            />
          )}
        </>
      )}
    </section>
  );
};
