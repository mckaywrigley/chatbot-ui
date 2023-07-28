import { FC, memo } from "react";
import { ChatMessage, Props } from "./ChatMessage";

const MemoizedChatMessage: FC<Props> = memo(
  ChatMessage,
  (prevProps, nextProps) => (
    prevProps.message.content === nextProps.message.content
  )
);

export default MemoizedChatMessage;