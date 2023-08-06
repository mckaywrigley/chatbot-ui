import { FC, memo } from "react";
import { ChatMessage, Props } from "./ChatMessage";

export const MemoizedChatMessage: FC<Props> = memo(
    ChatMessage,
    (prevProps, nextProps) => (
        prevProps.chatNode.message.content === nextProps.chatNode.message.content
    )
);
