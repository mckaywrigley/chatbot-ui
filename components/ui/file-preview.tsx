import { cn } from "@/lib/utils"
import { Tables } from "@/supabase/types"
import { ChatFile, MessageImage } from "@/types"
import { IconFileFilled } from "@tabler/icons-react"
import Image from "next/image"
import { FC } from "react"
import { DrawingCanvas } from "../utility/drawing-canvas"
import { Dialog, DialogContent } from "./dialog"

interface FilePreviewProps {
  type: "image" | "file" | "file_item"
  item: ChatFile | MessageImage | Tables<"file_items">
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
}

export const FilePreview: FC<FilePreviewProps> = ({
  type,
  item,
  isOpen,
  onOpenChange
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex items-center justify-center outline-none",
          "border-transparent bg-transparent"
        )}
      >
        {(() => {
          if (type === "image") {
            const imageItem = item as MessageImage

            return imageItem.file ? (
              <DrawingCanvas imageItem={imageItem} />
            ) : (
              <Image
                className="rounded"
                src={imageItem.base64 || imageItem.url}
                alt="File image"
                width={2000}
                height={2000}
                style={{
                  maxHeight: "67vh",
                  maxWidth: "67vw"
                }}
              />
            )
          } else if (type === "file_item") {
            const fileItem = item as Tables<"file_items">
            return (
              <div className="bg-background text-primary h-[50vh] min-w-[700px] overflow-auto whitespace-pre-wrap rounded-xl p-4">
                <div>{fileItem.content}</div>
              </div>
            )
          } else if (type === "file") {
            return (
              <div className="rounded bg-blue-500 p-2">
                <IconFileFilled />
              </div>
            )
          }
        })()}
      </DialogContent>
    </Dialog>
  )
}
