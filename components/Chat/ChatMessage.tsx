import { Message } from "@/types";
import { FC } from "react";

interface Props {
  message: Message;
}

export const ChatMessage: FC<Props> = ({ message }) => {
  return (
    <div
      className={`flex justify-center px-[120px] py-[30px] whitespace-pre-wrap] ${message.role === "assistant" ? "dark:bg-[#434654] dark:text-neutral-100 bg-neutral-100 text-neutral-900 border border-neutral-300 dark:border-none" : "dark:bg-[#343541] dark:text-white text-neutral-900"}`}
      style={{ overflowWrap: "anywhere" }}
    >
      <div className="w-[650px] flex">
        <div className="mr-4 font-bold min-w-[40px]">{message.role === "assistant" ? "AI:" : "You:"}</div>

        <div className="whitespace-pre-wrap">{message.content}</div>
      </div>
    </div>
  );
};
