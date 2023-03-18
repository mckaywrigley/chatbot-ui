import { Message, OpenAIModel, OpenAIModelNames } from "@/types";
import { FC, useEffect, useRef } from "react";
import { ChatInput } from "./ChatInput";
import { ChatLoader } from "./ChatLoader";
import { ChatMessage } from "./ChatMessage";
import { ModelSelect } from "./ModelSelect";

interface Props {
  model: OpenAIModel;
  messages: Message[];
  messageIsStreaming: boolean,
  loading: boolean;
  lightMode: "light" | "dark";
  onSend: (message: Message) => void;
  onSelect: (model: OpenAIModel) => void;
}

export const Chat: FC<Props> = ({ model, messages, messageIsStreaming, loading, lightMode, onSend, onSelect }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="h-full w-full flex flex-col dark:bg-[#343541]">
      <div className="flex-1 overflow-auto">
        {messages.length === 0 ? (
          <>
            <div className="flex justify-center pt-8 overflow-auto">
              <ModelSelect
                model={model}
                onSelect={onSelect}
              />
            </div>

            <div className="flex-1 text-4xl text-center text-neutral-300 pt-[280px]">Chatbot UI Pro</div>
          </>
        ) : (
          <>
            <div className="text-center py-3 dark:bg-[#444654] dark:text-neutral-300 text-neutral-500 text-sm border border-b-neutral-300 dark:border-none">Model: {OpenAIModelNames[model]}</div>

            {messages.map((message, index) => (
              <ChatMessage
                key={index}
                message={message}
                lightMode={lightMode}
              />
            ))}
            {loading && <ChatLoader />}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <div className="h-[80px] sm:h-[140px] w-[340px] sm:w-[400px] md:w-[500px] lg:w-[700px] xl:w-[800px] mx-auto">
        <ChatInput messageIsStreaming={messageIsStreaming} onSend={onSend} />
      </div>
    </div>
  );
};
