import { ChatbotUIContext } from "@/context/context"
import { createFile } from "@/db/files"
import { LLM_LIST } from "@/lib/models/llm/llm-list"
import { useContext, useEffect, useState } from "react"
import { toast } from "sonner"

export const ACCEPTED_FILE_TYPES = [
  // "text/csv", // TODO: Add support for CSVs
  // "application/msword", // TODO: Add support for DOCs
  // "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // TODO: Add support for DOCXs
  // "text/html", // TODO: Add support for HTML
  // "application/json", // TODO: Add support for JSON
  // "text/markdown", // TODO: Add support for Markdown
  "application/pdf"
  // "text/plain" // TODO: Add support for TXT
].join(",")

export const useSelectFileHandler = () => {
  const {
    selectedWorkspace,
    profile,
    chatSettings,
    setNewMessageImages,
    setNewMessageFiles,
    setShowFilesDisplay,
    setFiles,
    setUseRetrieval
  } = useContext(ChatbotUIContext)

  const [filesToAccept, setFilesToAccept] = useState(ACCEPTED_FILE_TYPES)

  useEffect(() => {
    handleFilesToAccept()
  }, [chatSettings?.model])

  const handleFilesToAccept = () => {
    const model = chatSettings?.model
    const FULL_MODEL = LLM_LIST.find(llm => llm.modelId === model)

    if (!FULL_MODEL) return

    setFilesToAccept(
      FULL_MODEL.imageInput
        ? `${ACCEPTED_FILE_TYPES},image/*`
        : ACCEPTED_FILE_TYPES
    )
  }

  const handleSelectDeviceFile = (file: File) => {
    setShowFilesDisplay(true)
    setUseRetrieval(true)

    if (file) {
      let reader = new FileReader()

      if (file.type.includes("image")) {
        reader.readAsDataURL(file)
      } else if (`${file.type}`.includes("pdf")) {
        reader.readAsArrayBuffer(file)
      } else if (
        ACCEPTED_FILE_TYPES.split(",").includes(file.type) ||
        file.type.includes("pdf")
      ) {
        // Use readAsArrayBuffer for PDFs and readAsText for other types
        file.type.includes("pdf")
          ? reader.readAsArrayBuffer(file)
          : reader.readAsText(file)
      } else {
        throw new Error("Unsupported file type")
      }

      reader.onloadend = async function () {
        try {
          if (file.type.includes("image")) {
            // Create a temp url for the image file
            const imageUrl = URL.createObjectURL(file)

            // This is a temporary image for display purposes in the chat input
            setNewMessageImages(prev => [
              ...prev,
              {
                messageId: "temp",
                path: "",
                base64: reader.result, // base64 image
                url: imageUrl,
                file
              }
            ])
          } else {
            if (!profile || !selectedWorkspace || !chatSettings) return

            let simplifiedFileType = file.type.split("/")[1]
            if (
              simplifiedFileType ===
              "vnd.openxmlformats-officedocument.wordprocessingml.document"
            ) {
              simplifiedFileType = "docx"
            } else if (simplifiedFileType === "msword") {
              simplifiedFileType = "doc"
            } else if (simplifiedFileType === "vnd.adobe.pdf") {
              simplifiedFileType = "pdf"
            }

            setNewMessageFiles(prev => [
              ...prev,
              {
                id: "loading",
                name: file.name,
                type: simplifiedFileType,
                file: file
              }
            ])

            const createdFile = await createFile(
              file,
              {
                user_id: profile.user_id,
                description: "",
                file_path: "",
                name: file.name,
                size: file.size,
                tokens: 0,
                type: simplifiedFileType
              },
              selectedWorkspace.id,
              chatSettings.embeddingsProvider
            )

            setFiles(prev => [...prev, createdFile])

            setNewMessageFiles(prev =>
              prev.map(item =>
                item.id === "loading"
                  ? {
                      id: createdFile.id,
                      name: createdFile.name,
                      type: createdFile.type,
                      file: file
                    }
                  : item
              )
            )
          }
        } catch (error) {
          console.error(error)
          toast.error("Failed to upload.")

          setNewMessageImages(prev =>
            prev.filter(img => img.messageId !== "temp")
          )
          setNewMessageFiles(prev => prev.filter(file => file.id !== "loading"))
        }
      }
    }
  }

  return {
    handleSelectDeviceFile,
    filesToAccept
  }
}
