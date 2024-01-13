import { ChatbotUIContext } from "@/context/context"
import { getCollectionFilesByCollectionId } from "@/db/collection-files"
import { Tables } from "@/supabase/types"
import { useContext } from "react"

export const usePromptAndCommand = () => {
  const {
    chatFiles,
    setNewMessageFiles,
    userInput,
    setUserInput,
    setShowFilesDisplay,
    setIsPromptPickerOpen,
    setIsAtPickerOpen,
    setSlashCommand,
    setAtCommand,
    setUseRetrieval
  } = useContext(ChatbotUIContext)

  const handleInputChange = (value: string) => {
    const slashTextRegex = /\/([^ ]*)$/
    const atTextRegex = /@([^ ]*)$/
    const slashMatch = value.match(slashTextRegex)
    const atMatch = value.match(atTextRegex)

    if (slashMatch) {
      setIsPromptPickerOpen(true)
      setSlashCommand(slashMatch[1])
    } else if (atMatch) {
      setIsAtPickerOpen(true)
      setAtCommand(atMatch[1])
    } else {
      setIsPromptPickerOpen(false)
      setIsAtPickerOpen(false)
      setSlashCommand("")
      setAtCommand("")
    }

    setUserInput(value)
  }

  const handleSelectPrompt = (prompt: Tables<"prompts">) => {
    setIsPromptPickerOpen(false)
    setUserInput(userInput.replace(/\/[^ ]*$/, "") + prompt.content)
  }

  const handleSelectUserFile = async (file: Tables<"files">) => {
    setShowFilesDisplay(true)
    setIsAtPickerOpen(false)
    setUseRetrieval(true)

    setNewMessageFiles(prev => {
      const fileAlreadySelected =
        prev.some(prevFile => prevFile.id === file.id) ||
        chatFiles.some(chatFile => chatFile.id === file.id)

      if (!fileAlreadySelected) {
        return [
          ...prev,
          {
            id: file.id,
            name: file.name,
            type: file.type,
            file: null
          }
        ]
      }
      return prev
    })

    setUserInput(userInput.replace(/@[^ ]*$/, ""))
  }

  const handleSelectUserCollection = async (
    collection: Tables<"collections">
  ) => {
    setShowFilesDisplay(true)
    setIsAtPickerOpen(false)
    setUseRetrieval(true)

    const collectionFiles = await getCollectionFilesByCollectionId(
      collection.id
    )

    setNewMessageFiles(prev => {
      const newFiles = collectionFiles.files
        .filter(
          file =>
            !prev.some(prevFile => prevFile.id === file.id) &&
            !chatFiles.some(chatFile => chatFile.id === file.id)
        )
        .map(file => ({
          id: file.id,
          name: file.name,
          type: file.type,
          file: null
        }))

      return [...prev, ...newFiles]
    })

    setUserInput(userInput.replace(/@[^ ]*$/, ""))
  }

  return {
    handleInputChange,
    handleSelectPrompt,
    handleSelectUserFile,
    handleSelectUserCollection
  }
}
