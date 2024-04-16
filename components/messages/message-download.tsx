import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import { FC, useRef, useState } from "react"
import { Input } from "../ui/input"

import toast from "react-hot-toast"

const notify = (filename: string) =>
  toast.success(
    `The message has been successfully downloaded as ${filename}.txt`,
    {
      duration: 2000,
      iconTheme: {
        primary: "#14B8A6",
        secondary: "#191617"
      }
    }
  )

interface MessageDownloadProps {
  message: any
}

export const MessageDownload: FC<MessageDownloadProps> = ({ message }) => {
  const buttonRef = useRef<HTMLButtonElement>(null)

  const [showDialog, setShowDialog] = useState(false)
  const [fileName, setFileName] = useState("")
  const [isFocused, setIsFocused] = useState(false)

  const handleDownload = () => {
    const blob = new Blob([message.content], { type: "text/plain" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)

    setShowDialog(false)
    if (notify) {
      notify(fileName)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      e.stopPropagation()
      buttonRef.current?.click()
    }
  }

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogTrigger asChild>
        <div className="cursor-pointer">
          <i className="fa-regular fa-arrow-down-to-line text-pixelspace-gray-40"></i>
        </div>
      </DialogTrigger>

      <DialogContent onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle>Download message</DialogTitle>

          {/* <DialogDescription>
            Are you sure you want to delete {item.name}?
          </DialogDescription> */}
          <div className="label flex h-7 flex-col justify-center text-sm font-normal leading-[180%] text-[#e6e4e5]">
            Save message as (e.g., filename.txt)
          </div>
          <div
            className={`bg-pixelspace-gray-70 focus:border-pixelspace-gray-40 flex h-[42px] w-[592px] items-center rounded-md border px-2 py-3  ${!isFocused || fileName.length > 0 ? "border-pixelspace-gray-50" : "border-pixelspace-gray-40"} mb-2`}
          >
            <Input
              style={{ border: "none", outline: "none" }}
              placeholder={`Type your filename`}
              className={`bg-pixelspace-gray-70  text-sm ${fileName.length > 0 ? "text-pixelspace-gray-3" : "text-pixelspace-gray-20 "} h-[40px] border-none font-normal`}
              value={fileName}
              onChange={e => setFileName(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
            />
          </div>
        </DialogHeader>
        <DialogFooter>
          <Button
            size={"cancelPrompt"}
            variant="ghost"
            onClick={() => setShowDialog(false)}
          >
            Cancel
          </Button>

          <Button
            ref={buttonRef}
            size={"cancelPrompt"}
            variant="download"
            onClick={handleDownload}
          >
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
