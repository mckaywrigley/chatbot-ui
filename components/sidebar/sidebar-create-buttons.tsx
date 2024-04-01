import { useChatHandler } from "@/components/chat/chat-hooks/use-chat-handler"
import { ChatbotUIContext } from "@/context/context"
import { createFolder } from "@/db/folders"
import { ContentType } from "@/types"
import { IconFolderPlus, IconPlus } from "@tabler/icons-react"
import { FC, useContext, useEffect, useRef, useState } from "react"
import { Button } from "../ui/button"
import { CreateAssistant } from "./items/assistants/create-assistant"
import { CreateCollection } from "./items/collections/create-collection"
import { CreateFile } from "./items/files/create-file"
import { CreateModel } from "./items/models/create-model"
import { CreatePreset } from "./items/presets/create-preset"
import { CreatePrompt } from "./items/prompts/create-prompt"
import { CreateTool } from "./items/tools/create-tool"
import {
  Position,
  shouldRenderMenuOnTop
} from "@/Core/Utils/context-menu-helper"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faPlus } from "@fortawesome/free-solid-svg-icons"

interface SidebarCreateButtonsProps {
  contentType: ContentType
  hasData: boolean
}

export const SidebarCreateButtons: FC<SidebarCreateButtonsProps> = ({
  contentType,
  hasData
}) => {
  const { profile, selectedWorkspace, folders, setFolders } =
    useContext(ChatbotUIContext)
  const { handleNewChat } = useChatHandler()

  const [isCreatingPrompt, setIsCreatingPrompt] = useState(false)
  const [isCreatingPreset, setIsCreatingPreset] = useState(false)
  const [isCreatingFile, setIsCreatingFile] = useState(false)
  const [isCreatingCollection, setIsCreatingCollection] = useState(false)
  const [isCreatingAssistant, setIsCreatingAssistant] = useState(false)
  const [isCreatingTool, setIsCreatingTool] = useState(false)
  const [isCreatingModel, setIsCreatingModel] = useState(false)

  // hooks context menu
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 })
  const [renderOnTop, setRenderOnTop] = useState(false)
  const menuRef = useRef<any>(null)
  // End hooks context menu

  // Menu context logic
  const handleMenuButtonClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation()

    setIsMenuOpen(!isMenuOpen)
    const rect = e.currentTarget.getBoundingClientRect()

    const menuHeight = 150

    let menuPositionY

    const offsetX = -9
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

  const handleCreateFolder = async () => {
    if (!profile) return
    if (!selectedWorkspace) return

    const createdFolder = await createFolder({
      user_id: profile.user_id,
      workspace_id: selectedWorkspace.id,
      name: "New Folder",
      description: "",
      type: contentType
    })
    setFolders([...folders, createdFolder])
  }

  const getCreateFunction = () => {
    const prepareAction = (action: Function) => async () => {
      setIsMenuOpen(false)
      await action()
    }

    switch (contentType) {
      case "chats":
        return prepareAction(async () => {
          handleNewChat()
        })

      case "presets":
        return prepareAction(async () => {
          setIsCreatingPreset(true)
        })

      case "prompts":
        return prepareAction(async () => {
          setIsCreatingPrompt(true)
        })

      case "files":
        return prepareAction(async () => {
          setIsCreatingFile(true)
        })

      case "collections":
        return prepareAction(async () => {
          setIsCreatingCollection(true)
        })

      case "assistants":
        return prepareAction(async () => {
          setIsCreatingAssistant(true)
        })

      case "tools":
        return prepareAction(async () => {
          setIsCreatingTool(true)
        })

      case "models":
        return prepareAction(async () => {
          setIsCreatingModel(true)
        })

      default:
        return async () => {}
    }
  }

  const getContentTypeText = (contentType: string): string => {
    if (contentType === "chats") {
      return "thread"
    } else {
      return contentType.slice(0, -1)
    }
  }

  return (
    <div className="flex space-x-2">
      <div
        className="ml-[5px] flex size-[42px] cursor-pointer items-center justify-center rounded border"
        onClick={e => {
          e.stopPropagation()
          handleMenuButtonClick(e)
        }}
      >
        <i
          className="fa-solid fa-plus text-pixelspace-gray-20"
          style={{ width: 16, height: 16 }}
        ></i>
      </div>

      {/* {hasData && (
        <Button className="size-[36px] p-1" onClick={handleCreateFolder}>
          <IconFolderPlus size={20} />
        </Button>
      )} */}

      {isMenuOpen && (
        <div
          ref={menuRef}
          style={{
            top: `${position.y}px`,
            left: `${position.x}px`
          }}
          className={`bg-pixelspace-gray-60 absolute z-20 w-44 divide-y rounded text-right shadow dark:divide-gray-600 `}
        >
          <ul
            className="text-sm text-gray-200 dark:text-gray-200"
            aria-labelledby="dropdownMenuIconHorizontalButton"
          >
            <li>
              <div
                role="button"
                onClick={getCreateFunction()}
                className="hover:bg-pixelspace-gray-70 dark:hover:bg-pixelspace-gray-70 text-pixelspace-gray-20 block w-full cursor-pointer rounded-t  p-[10px]  text-left text-sm font-normal dark:hover:text-white"
              >
                <FontAwesomeIcon icon={faPlus} className="mr-2 size-[14px]" />
                New {getContentTypeText(contentType)}
              </div>
            </li>

            {hasData && (
              <li>
                <div
                  role="button"
                  onClick={handleCreateFolder}
                  className="hover:bg-pixelspace-gray-55 dark:hover:bg-pixelspace-gray-70 text-pixelspace-gray-20  block w-full cursor-pointer items-center justify-center rounded-b p-[10px] text-left text-sm font-normal  dark:hover:text-white"
                >
                  <FontAwesomeIcon icon={faPlus} className="mr-2 size-[14px]" />
                  New folder
                </div>
              </li>
            )}
          </ul>
        </div>
      )}

      {isCreatingPrompt && (
        <CreatePrompt
          isOpen={isCreatingPrompt}
          onOpenChange={setIsCreatingPrompt}
        />
      )}

      {isCreatingPreset && (
        <CreatePreset
          isOpen={isCreatingPreset}
          onOpenChange={setIsCreatingPreset}
        />
      )}

      {isCreatingFile && (
        <CreateFile isOpen={isCreatingFile} onOpenChange={setIsCreatingFile} />
      )}

      {isCreatingCollection && (
        <CreateCollection
          isOpen={isCreatingCollection}
          onOpenChange={setIsCreatingCollection}
        />
      )}

      {isCreatingAssistant && (
        <CreateAssistant
          isOpen={isCreatingAssistant}
          onOpenChange={setIsCreatingAssistant}
        />
      )}

      {isCreatingTool && (
        <CreateTool isOpen={isCreatingTool} onOpenChange={setIsCreatingTool} />
      )}

      {isCreatingModel && (
        <CreateModel
          isOpen={isCreatingModel}
          onOpenChange={setIsCreatingModel}
        />
      )}
    </div>
  )
}
