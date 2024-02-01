import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { ChatbotUIContext } from "@/context/context"
import { Tables } from "@/supabase/types"
import {
  IconBooks,
  IconChevronDown,
  IconCircleCheckFilled
} from "@tabler/icons-react"
import { FileIcon } from "lucide-react"
import { FC, useContext, useEffect, useRef, useState } from "react"

interface AssistantRetrievalSelectProps {
  selectedAssistantRetrievalItems: Tables<"files">[] | Tables<"collections">[]
  onAssistantRetrievalItemsSelect: (
    item: Tables<"files"> | Tables<"collections">
  ) => void
}

export const AssistantRetrievalSelect: FC<AssistantRetrievalSelectProps> = ({
  selectedAssistantRetrievalItems,
  onAssistantRetrievalItemsSelect
}) => {
  const { files, collections } = useContext(ChatbotUIContext)

  const inputRef = useRef<HTMLInputElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState("")

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100) // FIX: hacky
    }
  }, [isOpen])

  const handleItemSelect = (item: Tables<"files"> | Tables<"collections">) => {
    onAssistantRetrievalItemsSelect(item)
  }

  if (!files || !collections) return null

  return (
    <DropdownMenu
      open={isOpen}
      onOpenChange={isOpen => {
        setIsOpen(isOpen)
        setSearch("")
      }}
    >
      <DropdownMenuTrigger
        className="bg-background w-full justify-start border-2 px-3 py-5"
        asChild
      >
        <Button
          ref={triggerRef}
          className="flex items-center justify-between"
          variant="ghost"
        >
          <div className="flex items-center">
            <div className="ml-2 flex items-center">
              {selectedAssistantRetrievalItems.length} files selected
            </div>
          </div>

          <IconChevronDown />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        style={{ width: triggerRef.current?.offsetWidth }}
        className="space-y-2 overflow-auto p-2"
        align="start"
      >
        <Input
          ref={inputRef}
          placeholder="Search files..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.stopPropagation()}
        />

        {selectedAssistantRetrievalItems
          .filter(item =>
            item.name.toLowerCase().includes(search.toLowerCase())
          )
          .map(item => (
            <AssistantRetrievalItemOption
              key={item.id}
              contentType={
                item.hasOwnProperty("type") ? "files" : "collections"
              }
              item={item as Tables<"files"> | Tables<"collections">}
              selected={selectedAssistantRetrievalItems.some(
                selectedAssistantRetrieval =>
                  selectedAssistantRetrieval.id === item.id
              )}
              onSelect={handleItemSelect}
            />
          ))}

        {files
          .filter(
            file =>
              !selectedAssistantRetrievalItems.some(
                selectedAssistantRetrieval =>
                  selectedAssistantRetrieval.id === file.id
              ) && file.name.toLowerCase().includes(search.toLowerCase())
          )
          .map(file => (
            <AssistantRetrievalItemOption
              key={file.id}
              item={file}
              contentType="files"
              selected={selectedAssistantRetrievalItems.some(
                selectedAssistantRetrieval =>
                  selectedAssistantRetrieval.id === file.id
              )}
              onSelect={handleItemSelect}
            />
          ))}

        {collections
          .filter(
            collection =>
              !selectedAssistantRetrievalItems.some(
                selectedAssistantRetrieval =>
                  selectedAssistantRetrieval.id === collection.id
              ) && collection.name.toLowerCase().includes(search.toLowerCase())
          )
          .map(collection => (
            <AssistantRetrievalItemOption
              key={collection.id}
              contentType="collections"
              item={collection}
              selected={selectedAssistantRetrievalItems.some(
                selectedAssistantRetrieval =>
                  selectedAssistantRetrieval.id === collection.id
              )}
              onSelect={handleItemSelect}
            />
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface AssistantRetrievalOptionItemProps {
  contentType: "files" | "collections"
  item: Tables<"files"> | Tables<"collections">
  selected: boolean
  onSelect: (item: Tables<"files"> | Tables<"collections">) => void
}

const AssistantRetrievalItemOption: FC<AssistantRetrievalOptionItemProps> = ({
  contentType,
  item,
  selected,
  onSelect
}) => {
  const handleSelect = () => {
    onSelect(item)
  }

  return (
    <div
      className="flex cursor-pointer items-center justify-between py-0.5 hover:opacity-50"
      onClick={handleSelect}
    >
      <div className="flex grow items-center truncate">
        {contentType === "files" ? (
          <div className="mr-2 min-w-[24px]">
            <FileIcon type={(item as Tables<"files">).type} size={24} />
          </div>
        ) : (
          <div className="mr-2 min-w-[24px]">
            <IconBooks size={24} />
          </div>
        )}

        <div className="truncate">{item.name}</div>
      </div>

      {selected && (
        <IconCircleCheckFilled size={20} className="min-w-[30px] flex-none" />
      )}
    </div>
  )
}
