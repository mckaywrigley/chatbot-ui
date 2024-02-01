import { ChatbotUIContext } from "@/context/context"
import { Tables } from "@/supabase/types"
import { IconBolt } from "@tabler/icons-react"
import { FC, useContext, useEffect, useRef } from "react"
import { usePromptAndCommand } from "./chat-hooks/use-prompt-and-command"

interface ToolPickerProps {}

export const ToolPicker: FC<ToolPickerProps> = ({}) => {
  const {
    tools,
    focusTool,
    toolCommand,
    isToolPickerOpen,
    setIsToolPickerOpen
  } = useContext(ChatbotUIContext)

  const { handleSelectTool } = usePromptAndCommand()

  const itemsRef = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    if (focusTool && itemsRef.current[0]) {
      itemsRef.current[0].focus()
    }
  }, [focusTool])

  const filteredTools = tools.filter(tool =>
    tool.name.toLowerCase().includes(toolCommand.toLowerCase())
  )

  const handleOpenChange = (isOpen: boolean) => {
    setIsToolPickerOpen(isOpen)
  }

  const callSelectTool = (tool: Tables<"tools">) => {
    handleSelectTool(tool)
    handleOpenChange(false)
  }

  const getKeyDownHandler =
    (index: number) => (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Backspace") {
        e.preventDefault()
        handleOpenChange(false)
      } else if (e.key === "Enter") {
        e.preventDefault()
        callSelectTool(filteredTools[index])
      } else if (
        (e.key === "Tab" || e.key === "ArrowDown") &&
        !e.shiftKey &&
        index === filteredTools.length - 1
      ) {
        e.preventDefault()
        itemsRef.current[0]?.focus()
      } else if (e.key === "ArrowUp" && !e.shiftKey && index === 0) {
        // go to last element if arrow up is pressed on first element
        e.preventDefault()
        itemsRef.current[itemsRef.current.length - 1]?.focus()
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        const prevIndex =
          index - 1 >= 0 ? index - 1 : itemsRef.current.length - 1
        itemsRef.current[prevIndex]?.focus()
      } else if (e.key === "ArrowDown") {
        e.preventDefault()
        const nextIndex = index + 1 < itemsRef.current.length ? index + 1 : 0
        itemsRef.current[nextIndex]?.focus()
      }
    }

  return (
    <>
      {isToolPickerOpen && (
        <div className="bg-background flex flex-col space-y-1 rounded-xl border-2 p-2 text-sm">
          {filteredTools.length === 0 ? (
            <div className="text-md flex h-14 cursor-pointer items-center justify-center italic hover:opacity-50">
              No matching tools.
            </div>
          ) : (
            <>
              {filteredTools.map((item, index) => (
                <div
                  key={item.id}
                  ref={ref => {
                    itemsRef.current[index] = ref
                  }}
                  tabIndex={0}
                  className="hover:bg-accent focus:bg-accent flex cursor-pointer items-center rounded p-2 focus:outline-none"
                  onClick={() => callSelectTool(item as Tables<"tools">)}
                  onKeyDown={getKeyDownHandler(index)}
                >
                  <IconBolt size={32} />

                  <div className="ml-3 flex flex-col">
                    <div className="font-bold">{item.name}</div>

                    <div className="truncate text-sm opacity-80">
                      {item.description || "No description."}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </>
  )
}
