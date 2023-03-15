import { Message, OpenAIModel, OpenAIModelNames } from "@/types";
import { FC, useEffect, useRef } from "react";
import { ModelSelect } from "../ModelSelect";
import { ChatInput } from "./ChatInput";
import { ChatLoader } from "./ChatLoader";
import { ChatMessage } from "./ChatMessage";

interface Props {
  model: OpenAIModel;
  messages: Message[];
  loading: boolean;
  onSend: (message: Message) => void;
  onSelect: (model: OpenAIModel) => void;
}

export const Chat: FC<Props> = ({ model, messages, loading, onSend, onSelect }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="h-full flex flex-col">
      {messages.length === 0 ? (
        <>
          <div className="flex justify-center pt-8">
            <ModelSelect
              model={model}
              onSelect={onSelect}
            />
          </div>

          <div className="flex-1 text-4xl text-center text-neutral-300 pt-[280px]">Chatbot UI Pro</div>
        </>
      ) : (
        <>
          <div className="flex-1 overflow-auto">
            <div className="text-center py-3 dark:bg-[#434654] dark:text-neutral-300 text-neutral-500 text-sm border border-b-neutral-300 dark:border-none">Model: {OpenAIModelNames[model]}</div>

            {messages.map((message, index) => (
              <div key={index}>
                <ChatMessage message={message} />
              </div>
            ))}
            {loading && <ChatLoader />}
            <div ref={messagesEndRef} />
          </div>
        </>
      )}

      <div className="h-[140px] w-[800px] mx-auto">
        <ChatInput onSend={onSend} />
      </div>
    </div>
  );
};
