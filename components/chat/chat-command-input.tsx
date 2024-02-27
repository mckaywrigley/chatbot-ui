import { ChatbotUIContext } from "@/context/context"
import { FC, useContext } from "react"
import { usePromptAndCommand } from "./chat-hooks/use-prompt-and-command"
import { FilePicker } from "./file-picker"
// import { PromptPicker } from "./prompt-picker"

// import { ToolPicker } from "./tool-picker"

interface ChatCommandInputProps {}

export const ChatCommandInput: FC<ChatCommandInputProps> = ({}) => {
  const {
    newMessageFiles,
    chatFiles,
    slashCommand,
    isAtPickerOpen,
    setIsAtPickerOpen,
    atCommand,
    focusPrompt,
    focusFile
  } = useContext(ChatbotUIContext)

  const { handleSelectUserFile, handleSelectUserCollection } =
    usePromptAndCommand()

  return (
    <>
      {/* <div className="mb-1">
        <PromptPicker />
      </div> */}

      <div>
        <FilePicker
          isOpen={isAtPickerOpen}
          searchQuery={atCommand}
          onOpenChange={setIsAtPickerOpen}
          selectedFileIds={[...newMessageFiles, ...chatFiles].map(
            file => file.id
          )}
          selectedCollectionIds={[]}
          onSelectFile={handleSelectUserFile}
          onSelectCollection={handleSelectUserCollection}
          isFocused={focusFile}
        />
      </div>

      {/* <ToolPicker /> */}
    </>
  )
}
