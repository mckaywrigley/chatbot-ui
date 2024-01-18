import { ChatbotUIContext } from "@/context/context"
import { WORKSPACE_INSTRUCTIONS_MAX } from "@/db/limits"
import { updateWorkspace } from "@/db/workspaces"
import { LLMID } from "@/types"
import { IconHome, IconSettings } from "@tabler/icons-react"
import { FC, useContext, useRef, useState } from "react"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { ChatSettingsForm } from "../ui/chat-settings-form"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { LimitDisplay } from "../ui/limit-display"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "../ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { TextareaAutosize } from "../ui/textarea-autosize"
import { WithTooltip } from "../ui/with-tooltip"
import { DeleteWorkspace } from "./delete-workspace"

interface WorkspaceSettingsProps {}

export const WorkspaceSettings: FC<WorkspaceSettingsProps> = ({}) => {
  const {
    profile,
    selectedWorkspace,
    setSelectedWorkspace,
    setWorkspaces,
    setChatSettings
  } = useContext(ChatbotUIContext)

  const buttonRef = useRef<HTMLButtonElement>(null)

  const [isOpen, setIsOpen] = useState(false)

  const [name, setName] = useState(selectedWorkspace?.name || "")
  const [description, setDescription] = useState(
    selectedWorkspace?.description || ""
  )
  const [instructions, setInstructions] = useState(
    selectedWorkspace?.instructions || ""
  )

  const [defaultChatSettings, setDefaultChatSettings] = useState({
    model: selectedWorkspace?.default_model,
    prompt: selectedWorkspace?.default_prompt,
    temperature: selectedWorkspace?.default_temperature,
    contextLength: selectedWorkspace?.default_context_length,
    includeProfileContext: selectedWorkspace?.include_profile_context,
    includeWorkspaceInstructions:
      selectedWorkspace?.include_workspace_instructions,
    embeddingsProvider: selectedWorkspace?.embeddings_provider
  })

  const handleSave = async () => {
    if (!selectedWorkspace) return

    const updatedWorkspace = await updateWorkspace(selectedWorkspace.id, {
      ...selectedWorkspace,
      name,
      description,
      instructions,
      default_model: defaultChatSettings.model,
      default_prompt: defaultChatSettings.prompt,
      default_temperature: defaultChatSettings.temperature,
      default_context_length: defaultChatSettings.contextLength,
      embeddings_provider: defaultChatSettings.embeddingsProvider,
      include_profile_context: defaultChatSettings.includeProfileContext,
      include_workspace_instructions:
        defaultChatSettings.includeWorkspaceInstructions
    })

    if (
      defaultChatSettings.model &&
      defaultChatSettings.prompt &&
      defaultChatSettings.temperature &&
      defaultChatSettings.contextLength &&
      defaultChatSettings.includeProfileContext &&
      defaultChatSettings.includeWorkspaceInstructions &&
      defaultChatSettings.embeddingsProvider
    ) {
      setChatSettings({
        model: defaultChatSettings.model as LLMID,
        prompt: defaultChatSettings.prompt,
        temperature: defaultChatSettings.temperature,
        contextLength: defaultChatSettings.contextLength,
        includeProfileContext: defaultChatSettings.includeProfileContext,
        includeWorkspaceInstructions:
          defaultChatSettings.includeWorkspaceInstructions,
        embeddingsProvider: defaultChatSettings.embeddingsProvider as
          | "openai"
          | "local"
      })
    }

    setSelectedWorkspace(updatedWorkspace)
    setWorkspaces(workspaces => {
      return workspaces.map(workspace => {
        if (workspace.id === selectedWorkspace.id) {
          return updatedWorkspace
        }
        return workspace
      })
    })

    setIsOpen(false)
    setSelectedWorkspace(updatedWorkspace)
    setWorkspaces(workspaces => {
      return workspaces.map(workspace => {
        if (workspace.id === selectedWorkspace.id) {
          return updatedWorkspace
        }
        return workspace
      })
    })

    toast.success("Workspace updated!")
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      buttonRef.current?.click()
    }
  }

  if (!selectedWorkspace) return null
  if (!profile) return null

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <WithTooltip
          display={<div>Workspace Settings</div>}
          trigger={
            <IconSettings
              className="ml-3 cursor-pointer pr-[5px] hover:opacity-50"
              size={32}
              onClick={() => setIsOpen(true)}
            />
          }
        />
      </SheetTrigger>

      <SheetContent
        className="flex flex-col justify-between"
        side="left"
        onKeyDown={handleKeyDown}
      >
        <div className="grow">
          <SheetHeader>
            <SheetTitle className="flex items-center justify-between">
              Workspace Settings
              {selectedWorkspace?.is_home && <IconHome />}
            </SheetTitle>

            {selectedWorkspace?.is_home && (
              <div className="text-sm font-light">
                This is your home workspace.
              </div>
            )}
          </SheetHeader>

          <Tabs defaultValue="main">
            <TabsList className="mt-4 grid w-full grid-cols-2">
              <TabsTrigger value="main">Main</TabsTrigger>
              <TabsTrigger value="defaults">Defaults</TabsTrigger>
            </TabsList>

            <TabsContent className="mt-4 space-y-4" value="main">
              <>
                <div className="space-y-1">
                  <Label>Name</Label>

                  <Input
                    placeholder="Name..."
                    value={name}
                    onChange={e => setName(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <Label>Description</Label>

                  <Input
                    placeholder="Description... (optional)"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                  />
                </div>
              </>

              <div className="space-y-1">
                <Label>
                  How would you like the AI to respond in this workspace?
                </Label>

                <TextareaAutosize
                  placeholder="Instructions... (optional)"
                  value={instructions}
                  onValueChange={setInstructions}
                  minRows={5}
                  maxRows={10}
                />

                <LimitDisplay
                  used={instructions.length}
                  limit={WORKSPACE_INSTRUCTIONS_MAX}
                />
              </div>
            </TabsContent>

            <TabsContent className="mt-5" value="defaults">
              <div className="mb-4 text-sm">
                These are the settings your workspace begins with when selected.
              </div>

              <ChatSettingsForm
                chatSettings={defaultChatSettings as any}
                onChangeChatSettings={setDefaultChatSettings}
              />
            </TabsContent>
          </Tabs>
        </div>

        <div className="mt-6 flex justify-between">
          <div>
            {!selectedWorkspace.is_home && (
              <DeleteWorkspace
                workspace={selectedWorkspace}
                onDelete={() => setIsOpen(false)}
              />
            )}
          </div>

          <div className="space-x-2">
            <Button variant="ghost" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>

            <Button ref={buttonRef} onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
