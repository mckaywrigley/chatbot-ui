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
import {
  faCircle,
  faEllipsisH,
  faPencil,
  faTrash
} from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"

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

  const [isMouseInside, setIsMouseInside] = useState(false)

  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const [renderOnTop, setRenderOnTop] = useState(false)

  const [position, setPosition] = useState<Position>({ x: 0, y: 0 })

  const menuRef = useRef<any>(null)

  const router = useRouter()
  const params = useParams()
  const isActive = params.chatid === chat.id || selectedChat?.id === chat.id

  // Menu context logic

  const handleMenuButtonClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation()

    setIsMenuOpen(!isMenuOpen)
    const rect = e.currentTarget.getBoundingClientRect()

    const menuHeight = 150

    let menuPositionY

    const offsetX = -5
    let offsetY = 18

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // End menu context logic

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

  const assistantImage = assistantImages.find(
    image => image.assistantId === chat.assistant_id
  )?.base64

  return (
    <div
      className={cn(
        "hover:bg-pixelspace-gray-70  group flex w-full cursor-pointer items-center rounded p-3  focus:outline-none",
        selectedChat?.id === chat.id && "bg-pixelspace-gray-70"
      )}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onClick={handleClick}
    >
      {chat.assistant_id ? (
        <div
          className={`size-1.5 rounded-full${selectedChat?.id === chat?.id ? "bg-pixelspace-pink" : "bg-pixelspace-gray-40"}`}
        ></div>
      ) : (
        <WithTooltip
          delayDuration={200}
          display={<div>{MODEL_DATA?.modelName}</div>}
          trigger={
            <div
              className={`size-1.5 rounded-full${selectedChat?.id === chat?.id ? "bg-pixelspace-pink" : "bg-pixelspace-gray-40"}`}
            ></div>
          }
        />
      )}

      <div className="ml-3 flex-1 truncate text-sm font-semibold">
        {chat.name}
      </div>
      <div
        role="button"
        className="size-[14px] text-white hover:text-neutral-100"
        onClick={e => {
          e.stopPropagation()
          handleMenuButtonClick(e)
        }}
        onMouseEnter={() => setIsMouseInside(true)}
        onMouseLeave={() => setIsMouseInside(false)}
      >
        {isMouseInside || selectedChat?.id === chat?.id ? (
          <FontAwesomeIcon className="flex" icon={faEllipsisH} />
        ) : null}
      </div>

      {isMenuOpen && (
        <div
          ref={menuRef}
          style={{
            top: `${position.y}px`,
            left: `${position.x}px`
          }}
          className={`bg-pixelspace-gray-60 absolute z-20 w-44 divide-y divide-gray-100 rounded text-right shadow dark:divide-gray-600 `}
        >
          <div className="block px-4 py-2 text-left">
            <span className="text-xs font-semibold text-gray-300 dark:text-gray-200">
              Thread options
            </span>
          </div>
          <ul
            className="py-2 text-sm text-gray-200 dark:text-gray-200"
            aria-labelledby="dropdownMenuIconHorizontalButton"
          >
            <li>
              <div className="hover:bg-pixelspace-gray-70 dark:hover:bg-pixelspace-gray-70 block w-full cursor-pointer px-4 py-2 text-left  text-xs  dark:hover:text-white">
                <UpdateChat chat={chat} />
              </div>
            </li>

            <hr className="dark:border-gray-600" />
            <li className="mt-1">
              <div className="hover:bg-pixelspace-gray-55 dark:hover:bg-pixelspace-gray-70 block w-full cursor-pointer px-4 py-2 text-left  text-xs  dark:hover:text-white">
                <DeleteChat chat={chat} />
              </div>
            </li>
          </ul>
        </div>
      )}
    </div>
  )
}
