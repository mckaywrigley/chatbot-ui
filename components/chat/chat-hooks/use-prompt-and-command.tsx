import { ChatbotUIContext } from "@/context/context"
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

    setNewMessageFiles(prev => [
      ...prev,
      ...chatFiles,
      {
        id: file.id,
        name: file.name,
        type: file.type,
        file: null
      }
    ])

    setUserInput(userInput.replace(/@[^ ]*$/, ""))
  }

  return {
    handleInputChange,
    handleSelectPrompt,
    handleSelectUserFile
  }
}
