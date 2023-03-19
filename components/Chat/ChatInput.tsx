import { Message } from "@/types";
import { IconSend } from "@tabler/icons-react";
import { FC, KeyboardEvent, useEffect, useRef, useState } from "react";

interface Props {
  messageIsStreaming: boolean;
  onSend: (message: Message) => void;
}

export const ChatInput: FC<Props> = ({ onSend, messageIsStreaming }) => {
  const [content, setContent] = useState<string>();
  const [isTyping, setIsTyping] = useState<boolean>(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const chatBoxMaxHeight = 400; //chat box max height in pixels

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length > 4000) {
      alert("Message limit is 4000 characters");
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
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!isTyping && e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    if (textareaRef && textareaRef.current) {
      let chatBoxHeight = textareaRef.current.scrollHeight;
      if (chatBoxHeight > chatBoxMaxHeight) {
        textareaRef.current.style.overflowY = "auto";
      } else {
        textareaRef.current.style.overflowY = "hidden";
      }

      textareaRef.current.style.height = "inherit";

      // Reset textarea height if there is no content
      if (content) {
        textareaRef.current.style.height = `${chatBoxHeight}px`;
      } else {
        textareaRef.current.style.height = "auto";
      }
    }
  }, [content]);

  return (
    <div className="relative">
      <div className="absolute bottom-[-80px] w-full">
        <textarea
          ref={textareaRef}
          className="rounded-lg pl-4 pr-8 py-3 w-full focus:outline-none max-h-[280px] dark:bg-[#40414F] dark:border-opacity-50 dark:border-neutral-800 dark:text-neutral-100 border border-neutral-300 shadow text-neutral-900"
          style={{
            resize: "none",
            bottom: `${textareaRef?.current?.scrollHeight}px`,
            maxHeight: `${chatBoxMaxHeight}px`,
            overflow: "hidden",
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
          className="absolute right-2 bottom-[14px] text-neutral-400 p-2 hover:dark:bg-neutral-800 hover:bg-neutral-400 hover:text-white rounded-md"
          onClick={handleSend}
        >
          <IconSend size={18} />
        </button>
      </div>
    </div>
  );
};
