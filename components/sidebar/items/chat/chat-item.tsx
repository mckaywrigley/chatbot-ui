import { ModelIcon } from "@/components/models/model-icon"
import { WithTooltip } from "@/components/ui/with-tooltip"
import { ChatbotUIContext } from "@/context/context"
import { LLM_LIST } from "@/lib/models/llm/llm-list"
import { cn } from "@/lib/utils"
import { Tables } from "@/supabase/types"
import { LLM } from "@/types"
import { IconRobotFace } from "@tabler/icons-react"
import Image from "next/image"
import { useParams, useRouter } from "next/navigation"
import { FC, useContext, useEffect, useRef, useState } from "react"
import { DeleteChat } from "./delete-chat"
import { UpdateChat } from "./update-chat"
import {
  Position,
  shouldRenderMenuOnTop
} from "@/Core/Utils/context-menu-helper"
import { faEllipsisH } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { Dialog, DialogContent, DialogTrigger } from "@radix-ui/react-dialog"
import { DownloadChat } from "./download-chat"

interface ChatItemProps {
  chat: Tables<"chats">
}

export const ChatItem: FC<ChatItemProps> = ({ chat }) => {
  const {
    selectedWorkspace,
    selectedChat,
    availableLocalModels,
    assistantImages,
    availableOpenRouterModels
  } = useContext(ChatbotUIContext)

  const [showChatDialog, setShowChatDialog] = useState(false)

  const [isMouseInside, setIsMouseInside] = useState(false)

  const [renderOnTop, setRenderOnTop] = useState(false)

  const [position, setPosition] = useState<Position>({ x: 0, y: 0 })

  const menuRef = useRef<any>(null)

  const router = useRouter()
  const params = useParams()

  // Menu context logic

  const handleMenuButtonClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation()

    const rect = e.currentTarget.getBoundingClientRect()

    const menuHeight = 150

    let menuPositionY

    const offsetX = -178
    let offsetY = 1

    if (rect.bottom + menuHeight > window.innerHeight) {
      menuPositionY = rect.top - menuHeight
      offsetY = -offsetY
    } else {
      menuPositionY = rect.bottom + offsetY
    }

    const menuPosition = {
      x: rect.left + offsetX,
      y: menuPositionY
    }

    setPosition(menuPosition)
  }

  useEffect(() => {
    setRenderOnTop(shouldRenderMenuOnTop(position))
  }, [position])

  const itemRef = useRef<HTMLDivElement>(null)

  const handleClick = () => {
    if (!selectedWorkspace) return
    return router.push(`/${selectedWorkspace.id}/chat/${chat.id}`)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      e.stopPropagation()
      itemRef.current?.click()
    }
  }

  const MODEL_DATA = [
    ...LLM_LIST,
    ...availableLocalModels,
    ...availableOpenRouterModels
  ].find(llm => llm.modelId === chat.model) as LLM

  return (
    <div
      className={cn(
        "hover:bg-pixelspace-gray-70  group flex w-full cursor-pointer items-center p-[11px] px-3  focus:outline-none",
        chat.folder_id ? "pl-5" : "",
        selectedChat?.id === chat.id && "bg-pixelspace-gray-70"
      )}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onClick={handleClick}
      onMouseEnter={e => {
        e.stopPropagation()
        setIsMouseInside(true)
      }}
      onMouseLeave={e => {
        e.stopPropagation()
        setIsMouseInside(false)
      }}
    >
      {chat.assistant_id ? (
        <div
          className={`size-1.5 rounded-full ${selectedChat?.id === chat?.id ? "bg-pixelspace-pink" : "bg-pixelspace-gray-40"}`}
        ></div>
      ) : (
        <WithTooltip
          delayDuration={200}
          display={<div>{MODEL_DATA?.modelName}</div>}
          trigger={
            <div
              className={`size-1.5 rounded-full ${selectedChat?.id === chat?.id ? " bg-pixelspace-pink" : " bg-pixelspace-gray-40"}`}
            ></div>
          }
        />
      )}

      <div className="text-pixelspace-gray-20 font-helvetica-now ml-3 flex-1 truncate text-sm font-normal">
        {chat.name}
      </div>
      <Dialog open={showChatDialog} onOpenChange={setShowChatDialog}>
        <DialogTrigger asChild>
          <div
            role="button"
            className="size-[14px] text-white hover:text-neutral-100"
            onClick={e => {
              e.stopPropagation()
              handleMenuButtonClick(e)
            }}
            onMouseEnter={e => {
              e.stopPropagation()
              setIsMouseInside(true)
            }}
            onMouseLeave={e => {
              e.stopPropagation()
              setIsMouseInside(false)
            }}
          >
            {isMouseInside ? (
              <FontAwesomeIcon
                className="text-pixelspace-gray-40 hover:text-pixelspace-gray-3 flex"
                icon={faEllipsisH}
              />
            ) : null}
          </div>
        </DialogTrigger>

        <DialogContent
          ref={menuRef}
          style={{
            top: `${position.y}px`,
            left: `${position.x}px`
          }}
          className={`bg-pixelspace-gray-60 divide-pixelspace-gray-70 absolute z-20 w-44 divide-y rounded text-right shadow  `}
        >
          <div className="block px-4 py-2 text-left">
            <div className="text-pixelspace-gray-20 text-sm font-normal ">
              Thread options
            </div>
          </div>
          <ul
            className="py-1 text-sm text-gray-200 dark:text-gray-200"
            aria-labelledby="dropdownMenuIconHorizontalButton"
          >
            <li>
              <div>
                <UpdateChat chat={chat} setShowChatDialog={setShowChatDialog} />
              </div>
            </li>

            <li className="mt-1">
              <div>
                <DownloadChat
                  chat={chat}
                  setShowChatDialog={setShowChatDialog}
                />
              </div>
            </li>

            <li className="mt-1">
              <div>
                <DeleteChat chat={chat} />
              </div>
            </li>
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  )
}
