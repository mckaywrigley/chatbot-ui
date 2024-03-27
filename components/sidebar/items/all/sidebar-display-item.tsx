import { ChatbotUIContext } from "@/context/context"
import { createChat } from "@/db/chats"
import { cn } from "@/lib/utils"
import { Tables } from "@/supabase/types"
import { ContentType, DataItemType } from "@/types"
import { useRouter } from "next/navigation"
import { FC, ReactNode, useContext, useRef, useState } from "react"
import { SidebarUpdateItem } from "./sidebar-update-item"

import Image from "next/image"

interface SidebarItemProps {
  item: DataItemType
  isTyping: boolean
  contentType: ContentType
  updateState: any
  renderInputs: (renderState: any) => JSX.Element
  icon?: ReactNode
}

export const SidebarItem: FC<SidebarItemProps> = ({
  item,
  contentType,
  updateState,
  renderInputs,

  isTyping
}) => {
  const { selectedWorkspace, setChats, setSelectedAssistant, assistantImages } =
    useContext(ChatbotUIContext)

  const router = useRouter()

  const itemRef = useRef<HTMLDivElement>(null)

  const [isHovering, setIsHovering] = useState(false)

  const actionMap = {
    chats: async (item: any) => {},
    presets: async (item: any) => {},
    prompts: async (item: any) => {},
    files: async (item: any) => {},
    collections: async (item: any) => {},
    assistants: async (assistant: Tables<"assistants">) => {
      if (!selectedWorkspace) return

      const createdChat = await createChat({
        user_id: assistant.user_id,
        workspace_id: selectedWorkspace.id,
        assistant_id: assistant.id,
        context_length: assistant.context_length,
        include_profile_context: assistant.include_profile_context,
        include_workspace_instructions:
          assistant.include_workspace_instructions,
        model: assistant.model,
        name: `Chat with ${assistant.name}`,
        prompt: assistant.prompt,
        temperature: assistant.temperature,
        embeddings_provider: assistant.embeddings_provider
      })

      setChats(prevState => [createdChat, ...prevState])
      setSelectedAssistant(assistant)

      return router.push(`/${selectedWorkspace.id}/chat/${createdChat.id}`)
    },
    tools: async (item: any) => {},
    models: async (item: any) => {}
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      e.stopPropagation()
      itemRef.current?.click()
    }
  }

  let iconComponent

  const hoverClass = isHovering
    ? "text-pixelspace-pink"
    : "text-pixelspace-gray-40"

  switch (contentType) {
    case "prompts":
      iconComponent = (
        <i
          className={`fa-solid fa-sparkle ${hoverClass}`}
          style={{ fontSize: 12 }}
        ></i>
      )
      break

    case "files":
      iconComponent = (
        <i
          className={`fa-regular fa-file ${hoverClass}`}
          style={{ fontSize: 12 }}
        ></i>
      )
      break
    case "collections":
      iconComponent = (
        <i
          className={`fa-regular fa-layer-group ${hoverClass}`}
          style={{ fontSize: 12 }}
        ></i>
      )
      break
    case "assistants":
      const assistant = item as any
      iconComponent = (assistant.image_path as any) ? (
        <Image
          src={
            assistantImages.find(image => image.path === assistant.image_path)
              ?.url || ""
          }
          alt={item.name}
          width={32}
          height={32}
          className="mt-2 size-5 cursor-pointer rounded-full hover:opacity-50"
        />
      ) : (
        <div className="bg-pixelspace-gray-60 flex size-5 items-center justify-center rounded-full">
          <i
            className="fa-regular fa-robot text-pixelspace-gray-20"
            style={{ fontSize: 11 }}
          ></i>
        </div>
      )
      console.log("item", item)
      break
    case "tools":
      iconComponent = (
        <i
          className={`fa-regular fa-bolt ${hoverClass}`}
          style={{ fontSize: 12 }}
        ></i>
      )
      break
    case "models":
      iconComponent = (
        <div className="bg-pixelspace-gray-60 flex size-5 items-center justify-center rounded-full">
          <i
            className={`fa-regular fa-microchip-ai ${hoverClass}`}
            style={{ fontSize: 11 }}
          ></i>
        </div>
      )
      break
    default:
      iconComponent = null
  }
  // end of switch statement

  return (
    <SidebarUpdateItem
      item={item}
      isTyping={isTyping}
      contentType={contentType}
      updateState={updateState}
      renderInputs={renderInputs}
    >
      <div
        ref={itemRef}
        className={cn(
          "hover:bg-pixelspace-gray-70  group flex w-full cursor-pointer items-center p-[11px] px-3 focus:outline-none "
        )}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {iconComponent}
        <div className="text-pixelspace-gray-20 ml-2 flex-1  truncate text-sm font-normal">
          {item.name}
        </div>
      </div>
    </SidebarUpdateItem>
  )
}
