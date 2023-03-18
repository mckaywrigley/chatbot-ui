import { Message } from "@/types";
import { FC } from "react";
import ReactMarkdown from "react-markdown";
import { CodeBlock } from "../Markdown/CodeBlock";

interface Props {
  message: Message;
  lightMode: "light" | "dark";
}

export const ChatMessage: FC<Props> = ({ message, lightMode }) => {
  return (
    <div
      className={`flex justify-center px-[120px] py-[30px] whitespace-pre-wrap] ${message.role === "assistant" ? "dark:bg-[#444654] dark:text-neutral-100 bg-neutral-100 text-neutral-900 border border-neutral-300 dark:border-none" : "dark:bg-[#343541] dark:text-white text-neutral-900"}`}
      style={{ overflowWrap: "anywhere" }}
    >
      <div className="w-[650px] flex align-middle">
        <div className="mr-4 font-bold min-w-[40px]">{message.role === "assistant" ? "AI:" : "You:"}</div>

        <div className="prose dark:prose-invert">
          <ReactMarkdown
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
              }
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
};
