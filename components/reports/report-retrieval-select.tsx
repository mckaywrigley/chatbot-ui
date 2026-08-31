import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { ChatbotUIContext } from "@/context/context"
import { Tables } from "@/supabase/types"
import { IconChevronDown, IconCircleCheckFilled } from "@tabler/icons-react"
import { FileIcon } from "lucide-react"
import { FC, useContext, useEffect, useRef, useState } from "react"

interface ReportRetrievalSelectProps {
  selectedRetrievalItems: Tables<"files">[]
  onRetrievalItemSelect: (item: Tables<"files">) => void
  fileType: "protocol" | "papers" | "dataFiles"
}

export const ReportRetrievalSelect: FC<ReportRetrievalSelectProps> = ({
  selectedRetrievalItems,
  onRetrievalItemSelect,
  fileType
}) => {
  const { files } = useContext(ChatbotUIContext)
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

  if (!files) return null

  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <DropdownMenu
      open={isOpen}
      onOpenChange={isOpen => {
        setIsOpen(isOpen)
        setSearch("")
      }}
    >
      <DropdownMenuTrigger className="w-full" asChild>
        <Button
          ref={triggerRef}
          className="flex w-full items-center justify-between"
          variant="outline"
        >
          <div className="flex items-center">
            <div className="ml-2">
              {selectedRetrievalItems.length} files selected
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

        <div className="max-h-[200px] overflow-auto">
          {filteredFiles.map(file => (
            <div
              key={file.id}
              className="hover:bg-accent flex cursor-pointer items-center justify-between rounded p-2"
              onClick={() => onRetrievalItemSelect(file)}
            >
              <div className="flex items-center">
                <FileIcon className="mr-2" size={20} />
                <span className="truncate">{file.name}</span>
              </div>
              {selectedRetrievalItems.some(
                selected => selected.id === file.id
              ) && <IconCircleCheckFilled size={20} />}
            </div>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
