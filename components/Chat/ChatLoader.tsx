import { IconDots } from "@tabler/icons-react";
import { FC } from "react";

interface Props {}

export const ChatLoader: FC<Props> = () => {
  return (
    <div
      className={`flex justify-center px-[120px] py-[30px] whitespace-pre-wrap dark:bg-[#434654] dark:text-neutral-100 bg-neutral-100 text-neutral-900 dark:border-none"`}
      style={{ overflowWrap: "anywhere" }}
    >
      <div className="w-[650px] flex">
        <div className="mr-4 font-bold min-w-[30px]">AI:</div>
        <IconDots className="animate-pulse" />
      </div>
    </div>
  );
};
