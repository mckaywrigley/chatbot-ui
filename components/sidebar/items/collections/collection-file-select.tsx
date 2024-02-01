import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { FileIcon } from "@/components/ui/file-icon"
import { Input } from "@/components/ui/input"
import { ChatbotUIContext } from "@/context/context"
import { CollectionFile } from "@/types"
import { IconChevronDown, IconCircleCheckFilled } from "@tabler/icons-react"
import { FC, useContext, useEffect, useRef, useState } from "react"

interface CollectionFileSelectProps {
  selectedCollectionFiles: CollectionFile[]
  onCollectionFileSelect: (file: CollectionFile) => void
}

export const CollectionFileSelect: FC<CollectionFileSelectProps> = ({
  selectedCollectionFiles,
  onCollectionFileSelect
}) => {
  const { files } = useContext(ChatbotUIContext)

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

  const handleFileSelect = (file: CollectionFile) => {
    onCollectionFileSelect(file)
  }

  if (!files) return null

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
              {selectedCollectionFiles.length} files selected
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

        {selectedCollectionFiles
          .filter(file =>
            file.name.toLowerCase().includes(search.toLowerCase())
          )
          .map(file => (
            <CollectionFileItem
              key={file.id}
              file={file}
              selected={selectedCollectionFiles.some(
                selectedCollectionFile => selectedCollectionFile.id === file.id
              )}
              onSelect={handleFileSelect}
            />
          ))}

        {files
          .filter(
            file =>
              !selectedCollectionFiles.some(
                selectedCollectionFile => selectedCollectionFile.id === file.id
              ) && file.name.toLowerCase().includes(search.toLowerCase())
          )
          .map(file => (
            <CollectionFileItem
              key={file.id}
              file={file}
              selected={selectedCollectionFiles.some(
                selectedCollectionFile => selectedCollectionFile.id === file.id
              )}
              onSelect={handleFileSelect}
            />
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface CollectionFileItemProps {
  file: CollectionFile
  selected: boolean
  onSelect: (file: CollectionFile) => void
}

const CollectionFileItem: FC<CollectionFileItemProps> = ({
  file,
  selected,
  onSelect
}) => {
  const handleSelect = () => {
    onSelect(file)
  }

  return (
    <div
      className="flex cursor-pointer items-center justify-between py-0.5 hover:opacity-50"
      onClick={handleSelect}
    >
      <div className="flex grow items-center truncate">
        <div className="mr-2 min-w-[24px]">
          <FileIcon type={file.type} size={24} />
        </div>

        <div className="truncate">{file.name}</div>
      </div>

      {selected && (
        <IconCircleCheckFilled size={20} className="min-w-[30px] flex-none" />
      )}
    </div>
  )
}
