import { cn } from "@/lib/utils"
import { Tables } from "@/supabase/types"
import { ContentType } from "@/types"
import { FC, useEffect, useRef, useState } from "react"
import { DeleteFolder } from "./delete-folder"
import { UpdateFolder } from "./update-folder"
import {
  Position,
  shouldRenderMenuOnTop
} from "@/Core/Utils/context-menu-helper"
import { FolderClosed } from "lucide-react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faEllipsisH } from "@fortawesome/free-solid-svg-icons"
import { Dialog, DialogContent, DialogTrigger } from "@radix-ui/react-dialog"

interface FolderProps {
  folder: Tables<"folders">
  contentType: ContentType
  children: React.ReactNode
  onUpdateFolder: (itemId: string, folderId: string | null) => void
}

export const Folder: FC<FolderProps> = ({
  folder,
  contentType,
  children,
  onUpdateFolder
}) => {
  const itemRef = useRef<HTMLDivElement>(null)

  const menuRef = useRef<any>(null)

  const [isDragOver, setIsDragOver] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const [showChatDialog, setShowChatDialog] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const [renderOnTop, setRenderOnTop] = useState(false)

  const [position, setPosition] = useState<Position>({ x: 0, y: 0 })

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
    e.stopPropagation()
    setIsExpanded(!isExpanded)
  }

  // Menu context logic

  const handleMenuButtonClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation()

    setIsMenuOpen(!isMenuOpen)
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
      onMouseEnter={e => {
        e.stopPropagation()
        setIsHovering(true)
      }}
      onMouseLeave={e => {
        e.stopPropagation()
        setIsHovering(false)
      }}
    >
      <div
        tabIndex={0}
        className={cn(
          " hover:bg-pixelspace-gray-70 flex w-full cursor-pointer items-center justify-between px-3 py-[11px]"
        )}
        onClick={handleClick}
      >
        <div className="flex w-full items-center justify-between">
          <div
            className={`flex items-center text-sm font-bold  ${isExpanded ? "text-pixelspace-gray-20" : "text-pixelspace-gray-3"}`}
          >
            <div>{folder.name}</div>
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
              >
                {isHovering && (
                  <FontAwesomeIcon
                    className="text-pixelspace-gray-40 hover:text-pixelspace-gray-3 flex"
                    icon={faEllipsisH}
                  />
                )}
              </div>
            </DialogTrigger>

            <DialogContent
              ref={menuRef}
              style={{
                top: `${position.y}px`,
                left: `${position.x}px`
              }}
              className={`bg-pixelspace-gray-60 divide-pixelspace-gray-70 absolute z-20 w-44 divide-y rounded text-right shadow `}
            >
              <div className="block px-4 py-2 text-left">
                <span className="text-pixelspace-gray-20 text-sm font-normal dark:text-gray-200">
                  Folder options
                </span>
              </div>
              <ul
                className=" py-1 text-sm text-gray-200 dark:text-gray-200"
                aria-labelledby="dropdownMenuIconHorizontalButton"
              >
                <li>
                  <div>
                    <UpdateFolder
                      setShowChatDialog={setShowChatDialog}
                      folder={folder}
                    />
                  </div>
                </li>

                <li className="mt-1">
                  <div>
                    <DeleteFolder folder={folder} contentType={contentType} />
                  </div>
                </li>
              </ul>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      {isExpanded && <div className=" mt-2 space-y-[1px]">{children}</div>}
    </div>
  )
}
