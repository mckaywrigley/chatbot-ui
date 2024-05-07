import { useContext } from "react"
import { ChatbotUIContext } from "@/context/context"
import { createFile } from "@/db/files"
import fs from "fs"

export const useLocalUserData = () => {
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

  const file = fs.readFileSync(
    "/Users/raphaelfeigl/Desktop/embeddings_local/embeddings/embeddings.json",
    "utf-8"
  )

  let simplifiedFileType = file.type.split("/")[1]

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
    "local"
  )
}
