import { Message, OpenAIModel, OpenAIModelID } from "@/types";
import { IconSend } from "@tabler/icons-react";
import { FC, KeyboardEvent, useEffect, useRef, useState } from "react";

interface Props {
  messageIsStreaming: boolean;
  onSend: (message: Message) => void;
  model: OpenAIModel;
}

export const ChatInput: FC<Props> = ({ onSend, messageIsStreaming, model }) => {
  const [content, setContent] = useState<string>();
  const [isTyping, setIsTyping] = useState<boolean>(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const maxLength = model.id === OpenAIModelID.GPT_3_5 ? 12000 : 24000;

    if (value.length > maxLength) {
      alert(`Message limit is ${maxLength} characters`);
      return;
    }

    setContent(value);
  };

  const handleSend = () => {
    if (messageIsStreaming) {
      return;
    }

    if (!content) {
      alert("Please enter a message");
      return;
    }

    onSend({ role: "user", content });
    setContent("");

    if (textareaRef && textareaRef.current) {
      textareaRef.current.blur();
    }
  };

  const isMobile = () => {
    const userAgent = typeof window.navigator === "undefined" ? "" : navigator.userAgent;
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i;
    return mobileRegex.test(userAgent);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!isTyping) {
      if (e.key === "Enter" && !e.shiftKey && !isMobile()) {
        e.preventDefault();
        handleSend();
      }
    }
  };

  useEffect(() => {
    if (textareaRef && textareaRef.current) {
      textareaRef.current.style.height = "inherit";
      textareaRef.current.style.height = `${textareaRef.current?.scrollHeight}px`;
    }
  }, [content]);

  return (
    <div className="fixed sm:absolute bottom-4 sm:bottom-8 w-full sm:w-1/2 px-2 left-0 sm:left-[280px] lg:left-[200px] right-0 ml-auto mr-auto">
      <textarea
        ref={textareaRef}
        className="rounded-lg pl-4 pr-8 py-3 w-full focus:outline-none dark:bg-[#40414F] dark:border-opacity-50 dark:border-neutral-800 dark:text-neutral-100 border border-neutral-300 shadow text-neutral-900"
        style={{
          resize: "none",
          bottom: `${textareaRef?.current?.scrollHeight}px`,
          maxHeight: "400px",
          overflow: "auto"
        }}
        placeholder="Type a message..."
        value={content}
        rows={1}
        onCompositionStart={() => setIsTyping(true)}
        onCompositionEnd={() => setIsTyping(false)}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />

      <button
        className="absolute right-5 bottom-[18px] focus:outline-none text-neutral-800 hover:text-neutral-900 dark:text-neutral-100 dark:hover:text-neutral-200 dark:bg-opacity-50 hover:bg-neutral-200 p-1 rounded-sm"
        onClick={handleSend}
      >
        <IconSend size={18} />
      </button>
    </div>
  );
};
