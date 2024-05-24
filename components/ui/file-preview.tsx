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

            return (
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
              <div className="bg-background text-primary max-h-[75vh] max-w-[95vw] overflow-auto whitespace-pre-wrap rounded-xl p-4 shadow-lg md:min-w-[50vw] lg:min-w-[700px]">
                <div className="text-lg leading-relaxed">
                  {fileItem.content}
                </div>
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
