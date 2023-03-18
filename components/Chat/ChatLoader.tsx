import { IconDots } from "@tabler/icons-react";
import { FC } from "react";

interface Props {}

export const ChatLoader: FC<Props> = () => {
  return (
    <div
      className={`flex justify-center py-[30px] whitespace-pre-wrap dark:bg-[#444654] dark:text-neutral-100 bg-neutral-100 text-neutral-900 dark:border-none"`}
      style={{ overflowWrap: "anywhere" }}
    >
      <div className="w-full px-4 sm:px-0 sm:w-2/3 md:w-1/2 flex">
        <div className="mr-4 font-bold min-w-[40px]">AI:</div>
        <IconDots className="animate-pulse" />
      </div>
    </div>
  );
};
