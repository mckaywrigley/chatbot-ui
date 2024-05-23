import { GPT4 } from "@/lib/models/llm/openai-llm-list"
import { toast } from "sonner"

export const handleFileUpload = (
  file: File,
  chatSettings: any,
  setShowConfirmationDialog: (show: boolean) => void,
  setCurrentFile: (file: File | null) => void,
  handleSelectDeviceFile: (file: File) => void
) => {
  const fileExtension = file.name.split(".").pop()?.toLowerCase() || ""

  const imageExtensions = ["jpg", "jpeg", "png", "gif", "bmp", "svg"]
  const videoExtensions = ["mp4", "avi", "mov", "wmv", "flv"]
  const supportedExtensions = [
    "csv",
    "json",
    "md",
    "pdf",
    "txt",
    "html",
    "htm",
    ...imageExtensions
  ]

  if (
    imageExtensions.includes(fileExtension) &&
    chatSettings?.model !== GPT4.modelId
  ) {
    toast.error("Image files are only supported by GPT-4o for now.")
    return
  } else if (videoExtensions.includes(fileExtension)) {
    toast.error("Video files are not supported yet.")
    return
  }

  if (fileExtension && !supportedExtensions.includes(fileExtension)) {
    setShowConfirmationDialog(true)
    setCurrentFile(file)
    return
  } else {
    handleSelectDeviceFile(file)
  }
}
