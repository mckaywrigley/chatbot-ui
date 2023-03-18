import { Message } from "@/types";
import { FC } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "../Markdown/CodeBlock";

interface Props {
  message: Message;
  lightMode: "light" | "dark";
}

export const ChatMessage: FC<Props> = ({ message, lightMode }) => {
  return (
    <div
      className={`flex justify-center py-[20px] sm:py-[30px] ${message.role === "assistant" ? "dark:bg-[#444654] dark:text-neutral-100 bg-neutral-100 text-neutral-900 border border-neutral-300 dark:border-none" : "dark:bg-[#343541] dark:text-white text-neutral-900"}`}
      style={{ overflowWrap: "anywhere" }}
    >
      <div className="w-full sm:w-4/5 md:w-3/5 lg:w-[600px] xl:w-[800px] flex px-4">
        <div className="mr-1 sm:mr-2 font-bold min-w-[40px]">{message.role === "assistant" ? "AI:" : "You:"}</div>

        <div className="prose dark:prose-invert mt-[-2px]">
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
