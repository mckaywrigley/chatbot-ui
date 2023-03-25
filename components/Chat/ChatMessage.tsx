import { Message } from "@/types";
import { IconEdit } from "@tabler/icons-react";
import { FC, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "../Markdown/CodeBlock";

interface Props {
  message: Message;
  messageIndex: number;
  lightMode: "light" | "dark";
  onEditMessage: (message: Message, messageIndex: number) => void;
  onDeleteMessage: (message: Message, messageIndex: number) => void;
}

export const ChatMessage: FC<Props> = ({ message, messageIndex, lightMode, onEditMessage, onDeleteMessage }) => {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isHovering, setIsHovering] = useState<boolean>(false);
  const [messageContent, setMessageContent] = useState(message.content);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const toggleEditing = () => {
    setIsEditing(!isEditing);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageContent(event.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "inherit";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const handleEditMessage = () => {
    onEditMessage({ ...message, content: messageContent }, messageIndex);
    setIsEditing(false);
  };

  const handlePressEnter = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleEditMessage();
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "inherit";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [isEditing]);

  return (
    <div
      className={`group ${message.role === "assistant" ? "text-gray-800 dark:text-gray-100 border-b border-black/10 dark:border-gray-900/50 bg-gray-50 dark:bg-[#444654]" : "text-gray-800 dark:text-gray-100 border-b border-black/10 dark:border-gray-900/50 bg-white dark:bg-[#343541]"}`}
      style={{ overflowWrap: "anywhere" }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="text-base gap-4 md:gap-6 md:max-w-2xl lg:max-w-2xl xl:max-w-3xl p-4 md:py-6 flex lg:px-0 m-auto relative">
        <div className="font-bold min-w-[40px]">{message.role === "assistant" ? "AI:" : "You:"}</div>

        <div className="prose dark:prose-invert mt-[-2px] w-full">
          {message.role === "user" ? (
            <div className="flex w-full">
              {isEditing ? (
                <div className="flex flex-col w-full">
                  <textarea
                    ref={textareaRef}
                    className="w-full dark:bg-[#343541] border-none resize-none outline-none whitespace-pre-wrap"
                    value={messageContent}
                    onChange={handleInputChange}
                    onKeyDown={handlePressEnter}
                    style={{
                      fontFamily: "inherit",
                      fontSize: "inherit",
                      lineHeight: "inherit",
                      padding: "0",
                      margin: "0",
                      overflow: "hidden"
                    }}
                  />

                  <div className="flex mt-10 justify-center space-x-4">
                    <button
                      className="h-[40px] bg-blue-500 text-white rounded-md px-4 py-1 text-sm font-medium enabled:hover:bg-blue-600 disabled:opacity-50"
                      onClick={handleEditMessage}
                      disabled={messageContent.trim().length <= 0}
                    >
                      Save & Submit
                    </button>
                    <button
                      className="h-[40px] border border-neutral-300 dark:border-neutral-700 rounded-md px-4 py-1 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      onClick={() => {
                        setMessageContent(message.content);
                        setIsEditing(false);
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="prose dark:prose-invert whitespace-pre-wrap">{message.content}</div>
              )}

              {(isHovering || window.innerWidth < 640) && !isEditing && (
                <button className={`absolute ${window.innerWidth < 640 ? "right-1 bottom-1" : "right-[-20px] top-[26px]"}`}>
                  <IconEdit
                    size={20}
                    className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    onClick={toggleEditing}
                  />
                </button>
              )}
            </div>
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || "");
                  return !inline && match ? (
                    <CodeBlock
                      key={Math.random()}
                      language={match[1]}
                      value={String(children).replace(/\n$/, "")}
                      lightMode={lightMode}
                      {...props}
                    />
                  ) : (
                    <code
                      className={className}
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
                table({ children }) {
                  return <table className="border-collapse border border-black dark:border-white py-1 px-3">{children}</table>;
                },
                th({ children }) {
                  return <th className="border border-black dark:border-white break-words py-1 px-3 bg-gray-500 text-white">{children}</th>;
                },
                td({ children }) {
                  return <td className="border border-black dark:border-white break-words py-1 px-3">{children}</td>;
                }
              }}
            >
              {message.content}
            </ReactMarkdown>
          )}
        </div>
      </div>
    </div>
  );
};
