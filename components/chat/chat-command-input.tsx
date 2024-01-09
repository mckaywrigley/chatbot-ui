import { ChatbotUIContext } from "@/context/context"
import { FC, useContext } from "react"
import { usePromptAndCommand } from "./chat-hooks/use-prompt-and-command"
import { FilePicker } from "./file-picker"
import { PromptPicker } from "./prompt-picker"

interface ChatCommandInputProps {}

export const ChatCommandInput: FC<ChatCommandInputProps> = ({}) => {
  const {
    chatFiles,
    slashCommand,
    isAtPickerOpen,
    setIsAtPickerOpen,
    atCommand,

    focusPrompt,
    focusFile
  } = useContext(ChatbotUIContext)

  const { handleSelectPrompt, handleSelectUserFile } = usePromptAndCommand()

  return (
    <>
      <PromptPicker
        searchQuery={slashCommand}
        onSelect={handleSelectPrompt}
        isFocused={focusPrompt}
      />

      <FilePicker
        isOpen={isAtPickerOpen}
        searchQuery={atCommand}
        onOpenChange={setIsAtPickerOpen}
        selectedFileIds={chatFiles.map(file => file.id)}
        selectedCollectionIds={[]}
        onSelectFile={handleSelectUserFile}
        onSelectCollection={() => {}}
        isFocused={focusFile}
      />
    </>
  )
}
