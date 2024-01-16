import { ChatbotUIContext } from "@/context/context"
import { Tables } from "@/supabase/types"
import { IconBooks } from "@tabler/icons-react"
import { FC, useContext, useEffect, useRef } from "react"
import { FileIcon } from "../ui/file-icon"

interface FilePickerProps {
  isOpen: boolean
  searchQuery: string
  onOpenChange: (isOpen: boolean) => void
  selectedFileIds: string[]
  selectedCollectionIds: string[]
  onSelectFile: (file: Tables<"files">) => void
  onSelectCollection: (collection: Tables<"collections">) => void
  isFocused: boolean
}

export const FilePicker: FC<FilePickerProps> = ({
  isOpen,
  searchQuery,
  onOpenChange,
  selectedFileIds,
  selectedCollectionIds,
  onSelectFile,
  onSelectCollection,
  isFocused
}) => {
  const { files, collections, setIsAtPickerOpen } = useContext(ChatbotUIContext)

  const itemsRef = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    if (isFocused && itemsRef.current[0]) {
      itemsRef.current[0].focus()
    }
  }, [isFocused])

  const filteredFiles = files.filter(
    file =>
      file.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !selectedFileIds.includes(file.id)
  )

  const filteredCollections = collections.filter(
    collection =>
      collection.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !selectedCollectionIds.includes(collection.id)
  )

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen)
  }

  const handleSelectFile = (file: Tables<"files">) => {
    onSelectFile(file)
    handleOpenChange(false)
  }

  const handleSelectCollection = (collection: Tables<"collections">) => {
    onSelectCollection(collection)
    handleOpenChange(false)
  }

  const getKeyDownHandler =
    (index: number, type: "file" | "collection", item: any) =>
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Escape") {
        e.preventDefault()
        setIsAtPickerOpen(false)
      } else if (e.key === "Backspace") {
        e.preventDefault()
      } else if (e.key === "Enter") {
        e.preventDefault()

        if (type === "file") {
          handleSelectFile(item)
        } else {
          handleSelectCollection(item)
        }
      } else if (
        (e.key === "Tab" || e.key === "ArrowDown") &&
        !e.shiftKey &&
        index === filteredFiles.length + filteredCollections.length - 1
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
      {isOpen && (
        <div className="bg-background flex flex-col space-y-1 rounded-xl border-2 p-2 text-sm">
          {filteredFiles.length === 0 && filteredCollections.length === 0 ? (
            <div className="text-md flex h-14 cursor-pointer items-center justify-center italic hover:opacity-50">
              No matching files.
            </div>
          ) : (
            <>
              {[...filteredFiles, ...filteredCollections].map((item, index) => (
                <div
                  key={item.id}
                  ref={ref => {
                    itemsRef.current[index] = ref
                  }}
                  tabIndex={0}
                  className="hover:bg-accent focus:bg-accent flex cursor-pointer items-center rounded p-2 focus:outline-none"
                  onClick={() => {
                    if ("type" in item) {
                      handleSelectFile(item as Tables<"files">)
                    } else {
                      handleSelectCollection(item)
                    }
                  }}
                  onKeyDown={e =>
                    getKeyDownHandler(
                      index,
                      "type" in item ? "file" : "collection",
                      item
                    )(e)
                  }
                >
                  {"type" in item ? (
                    <FileIcon type={(item as Tables<"files">).type} size={32} />
                  ) : (
                    <IconBooks size={32} />
                  )}

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
