import { Message, OpenAIModel, OpenAIModelNames } from "@/types";
import { FC, useEffect, useRef } from "react";
import { ChatInput } from "./ChatInput";
import { ChatLoader } from "./ChatLoader";
import { ChatMessage } from "./ChatMessage";
import { ModelSelect } from "./ModelSelect";

interface Props {
  model: OpenAIModel;
  messages: Message[];
  messageIsStreaming: boolean;
  loading: boolean;
  lightMode: "light" | "dark";
  onSend: (message: Message) => void;
  onSelect: (model: OpenAIModel) => void;
}

export const Chat: FC<Props> = ({ model, messages, messageIsStreaming, loading, lightMode, onSend, onSelect }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex-1 overflow-scroll dark:bg-[#343541]">
      <div>
        {messages.length === 0 ? (
          <>
            <div className="flex justify-center pt-8">
              <ModelSelect
                model={model}
                onSelect={onSelect}
              />
            </div>

            <div className="text-4xl text-center text-neutral-600 dark:text-neutral-200 pt-[160px] sm:pt-[280px]">Chatbot UI</div>
          </>
        ) : (
          <>
            <div className="flex justify-center py-2 text-neutral-500 bg-neutral-100 dark:bg-[#444654] dark:text-neutral-200 text-sm border border-b-neutral-300 dark:border-none">Model: {OpenAIModelNames[model]}</div>

            {messages.map((message, index) => (
              <ChatMessage
                key={index}
                message={message}
                lightMode={lightMode}
              />
            ))}

            {loading && <ChatLoader />}

            <div
              className="bg-white dark:bg-[#343541] h-24 sm:h-32"
              ref={messagesEndRef}
            />
          </>
        )}
      </div>

      <ChatInput
        messageIsStreaming={messageIsStreaming}
        onSend={onSend}
      />
    </div>
  );
};
