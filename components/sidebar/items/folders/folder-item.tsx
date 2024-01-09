import { cn } from "@/lib/utils"
import { Tables } from "@/supabase/types"
import { IconChevronDown, IconChevronRight } from "@tabler/icons-react"
import { FC, useRef, useState } from "react"
import { DeleteFolder } from "./delete-folder"
import { UpdateFolder } from "./update-folder"

interface FolderProps {
  folder: Tables<"folders">
  children: React.ReactNode
  onUpdateFolder: (itemId: string, folderId: string | null) => void
}

export const Folder: FC<FolderProps> = ({
  folder,
  children,
  onUpdateFolder
}) => {
  const itemRef = useRef<HTMLDivElement>(null)

  const [isDragOver, setIsDragOver] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isHovering, setIsHovering] = useState(false)

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()

    setIsDragOver(false)
    const itemId = e.dataTransfer.getData("text/plain")
    onUpdateFolder(itemId, folder.id)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      e.stopPropagation()
      itemRef.current?.click()
    }
  }

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsExpanded(!isExpanded)
  }

  return (
    <div
      ref={itemRef}
      id="folder"
      className={cn("rounded focus:outline-none", isDragOver && "bg-accent")}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div
        tabIndex={0}
        className={cn(
          "hover:bg-accent focus:bg-accent flex w-full cursor-pointer items-center justify-between rounded p-2 hover:opacity-50 focus:outline-none"
        )}
        onClick={handleClick}
      >
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center space-x-2">
            {isExpanded ? (
              <IconChevronDown stroke={3} />
            ) : (
              <IconChevronRight stroke={3} />
            )}

            <div>{folder.name}</div>
          </div>

          {isHovering && (
            <div
              onClick={e => {
                e.stopPropagation()
                e.preventDefault()
              }}
              className="ml-2 flex space-x-2"
            >
              <UpdateFolder folder={folder} />

              <DeleteFolder folder={folder} />
            </div>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="ml-5 mt-2 space-y-2 border-l-2 pl-4">{children}</div>
      )}
    </div>
  )
}
