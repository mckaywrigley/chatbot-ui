import { ChatbotUIContext } from "@/context/context"
import { Tables } from "@/supabase/types"
import { FC, useContext } from "react"
import { AssistantPicker } from "./assistant-picker"
import { usePromptAndCommand } from "./chat-hooks/use-prompt-and-command"
import { FilePicker } from "./file-picker"
import { PromptPicker } from "./prompt-picker"
import { ToolPicker } from "./tool-picker"

interface ChatCommandInputProps {
  prompts: Tables<"prompts">[]
  files: Tables<"files">[]
  collections: Tables<"collections">[]
  tools: Tables<"tools">[]
  assistants: Tables<"assistants">[]
}

export const ChatCommandInput: FC<ChatCommandInputProps> = ({
  prompts,
  files,
  collections,
  tools,
  assistants
}) => {
  const {} = useContext(ChatbotUIContext)

  const { handleSelectUserFile, handleSelectUserCollection } =
    usePromptAndCommand()

  return (
    <>
      <PromptPicker prompts={prompts} />

      <FilePicker files={files} collections={collections} />

      <ToolPicker tools={tools} />

      <AssistantPicker assistants={assistants} />
    </>
  )
}
