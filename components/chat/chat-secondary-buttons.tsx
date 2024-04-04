import { useChatHandler } from "@/components/chat/chat-hooks/use-chat-handler"
import { ChatbotUIContext } from "@/context/context"

import { FC, useContext } from "react"
import { WithTooltip } from "../ui/with-tooltip"

interface ChatSecondaryButtonsProps {}

export const ChatSecondaryButtons: FC<ChatSecondaryButtonsProps> = ({}) => {
  const { selectedChat } = useContext(ChatbotUIContext)

  const { handleNewChat } = useChatHandler()

  return (
    <>
      {selectedChat && (
        <>
          <WithTooltip
            delayDuration={200}
            className="p-[24px]"
            side="left"
            display={
              <div>
                <div className="mb-4 text-base font-bold ">Thread Info</div>

                <div className="mx-auto mt-2 max-w-xs space-y-2 text-sm sm:max-w-sm md:max-w-md lg:max-w-lg">
                  <div className="text-pixelspace-gray-3 font-bold leading-[25.20px]">
                    Model:{" "}
                    <span className="text-pixelspace-gray-3 font-normal leading-[25.20px]">
                      {selectedChat.model}
                    </span>
                  </div>
                  <div className="text-pixelspace-gray-3 font-bold leading-[25.20px]">
                    Prompt:{" "}
                    <span className="text-pixelspace-gray-3 font-normal leading-[25.20px]">
                      {selectedChat.prompt}
                    </span>
                  </div>

                  <div className="text-pixelspace-gray-3 font-bold leading-[25.20px]">
                    Temperature:{" "}
                    <span className="text-pixelspace-gray-3 font-normal leading-[25.20px]">
                      {selectedChat.temperature}
                    </span>
                  </div>
                  <div className="text-pixelspace-gray-3 font-bold leading-[25.20px]">
                    Context Length:{" "}
                    <span className="text-pixelspace-gray-3 font-normal leading-[25.20px]">
                      {selectedChat.context_length}
                    </span>
                  </div>

                  <div className="text-pixelspace-gray-3 font-bold leading-[25.20px]">
                    Profile Context:{" "}
                    <span className="text-pixelspace-gray-3 font-normal leading-[25.20px]">
                      {selectedChat.include_profile_context
                        ? "Enabled"
                        : "Disabled"}
                    </span>
                  </div>
                  <div className="text-pixelspace-gray-3 font-bold leading-[25.20px]">
                    {" "}
                    Workspace Instructions:{" "}
                    <span className="text-pixelspace-gray-3 font-normal leading-[25.20px]">
                      {" "}
                      {selectedChat.include_workspace_instructions
                        ? "Enabled"
                        : "Disabled"}
                    </span>
                  </div>

                  <div className="text-pixelspace-gray-3 font-bold leading-[25.20px]">
                    Embeddings Provider:{" "}
                    <span>{selectedChat.embeddings_provider}</span>
                  </div>
                </div>
              </div>
            }
            trigger={
              <div className="mt-1">
                <i className="fa-regular fa-circle-info text-pixelspace-gray-3"></i>
              </div>
            }
          />

          <div className="bg-pixelspace-gray-60 h-5 w-[1px]"></div>

          <WithTooltip
            delayDuration={200}
            side="left"
            display={<div>Start a new chat</div>}
            trigger={
              <div className="mt-1" role="button" onClick={handleNewChat}>
                <i className="fa-kit fa-thread-plus-simple text-pixelspace-gray-3"></i>
              </div>
            }
          />
        </>
      )}
    </>
  )
}
