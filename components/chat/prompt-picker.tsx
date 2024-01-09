import { ChatbotUIContext } from "@/context/context"
import { Tables } from "@/supabase/types"
import { FC, useContext, useEffect, useRef, useState } from "react"
import { Button } from "../ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog"
import { Label } from "../ui/label"
import { TextareaAutosize } from "../ui/textarea-autosize"

interface PromptPickerProps {
  searchQuery: string
  onSelect: (prompt: Tables<"prompts">) => void
  isFocused: boolean
}

export const PromptPicker: FC<PromptPickerProps> = ({
  searchQuery,
  onSelect,
  isFocused
}) => {
  const { prompts, isPromptPickerOpen, setIsPromptPickerOpen } =
    useContext(ChatbotUIContext)

  const firstPromptRef = useRef<HTMLDivElement>(null)

  const [promptVariables, setPromptVariables] = useState<
    {
      promptId: string
      name: string
      value: string
    }[]
  >([])
  const [showPromptVariables, setShowPromptVariables] = useState(false)

  const filteredPrompts = prompts.filter(prompt =>
    prompt.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleOpenChange = (isOpen: boolean) => {
    setIsPromptPickerOpen(isOpen)
  }

  const handleSelectPrompt = (prompt: Tables<"prompts">) => {
    const regex = /\{\{.*?\}\}/g
    const matches = prompt.content.match(regex)

    if (matches) {
      const newPromptVariables = matches.map(match => ({
        promptId: prompt.id,
        name: match.replace(/\{\{|\}\}/g, ""),
        value: ""
      }))

      setPromptVariables(newPromptVariables)
      setShowPromptVariables(true)
    } else {
      onSelect(prompt)
      handleOpenChange(false)
    }
  }

  const getKeyDownHandler =
    (index: number) => (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Backspace") {
        e.preventDefault()
        handleOpenChange(false)
      } else if (e.key === "Enter") {
        e.preventDefault()
        handleSelectPrompt(filteredPrompts[index])
      } else if (
        e.key === "Tab" &&
        !e.shiftKey &&
        index === filteredPrompts.length - 1
      ) {
        e.preventDefault()
        firstPromptRef.current?.focus()
      }
    }

  const handleSubmitPromptVariables = () => {
    const newPromptContent = promptVariables.reduce(
      (prevContent, variable) =>
        prevContent.replace(
          new RegExp(`\\{\\{${variable.name}\\}\\}`, "g"),
          variable.value
        ),
      prompts.find(prompt => prompt.id === promptVariables[0].promptId)
        ?.content || ""
    )

    const newPrompt: any = {
      ...prompts.find(prompt => prompt.id === promptVariables[0].promptId),
      content: newPromptContent
    }

    onSelect(newPrompt)
    handleOpenChange(false)
    setShowPromptVariables(false)
    setPromptVariables([])
  }

  const handleCancelPromptVariables = () => {
    setShowPromptVariables(false)
    setPromptVariables([])
  }

  const handleKeydownPromptVariables = (
    e: React.KeyboardEvent<HTMLDivElement>
  ) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmitPromptVariables()
    }
  }

  useEffect(() => {
    firstPromptRef.current?.focus()
  }, [isFocused])

  return (
    <>
      {isPromptPickerOpen && (
        <div className="bg-background flex flex-col space-y-1 rounded-xl border-2 p-2 text-sm">
          {showPromptVariables ? (
            <Dialog
              open={showPromptVariables}
              onOpenChange={setShowPromptVariables}
            >
              <DialogContent onKeyDown={handleKeydownPromptVariables}>
                <DialogHeader>
                  <DialogTitle>Enter Prompt Variables</DialogTitle>
                </DialogHeader>

                <div className="mt-2 space-y-6">
                  {promptVariables.map((variable, index) => (
                    <div key={index} className="flex flex-col space-y-2">
                      <Label>{variable.name}</Label>

                      <TextareaAutosize
                        placeholder={`Enter a value for ${variable.name}...`}
                        value={variable.value}
                        onValueChange={value => {
                          const newPromptVariables = [...promptVariables]
                          newPromptVariables[index].value = value
                          setPromptVariables(newPromptVariables)
                        }}
                        minRows={3}
                        maxRows={5}
                      />
                    </div>
                  ))}
                </div>

                <div className="mt-2 flex justify-end space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelPromptVariables}
                  >
                    Cancel
                  </Button>

                  <Button size="sm" onClick={handleSubmitPromptVariables}>
                    Submit
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          ) : filteredPrompts.length === 0 ? (
            <div className="text-md flex h-14 cursor-pointer items-center justify-center italic hover:opacity-50">
              No matching prompts.
            </div>
          ) : (
            filteredPrompts.map((prompt, index) => (
              <div
                key={prompt.id}
                ref={index === 0 ? firstPromptRef : null}
                tabIndex={0}
                className="hover:bg-accent focus:bg-accent flex cursor-pointer flex-col rounded p-2 focus:outline-none"
                onClick={() => handleSelectPrompt(prompt)}
                onKeyDown={getKeyDownHandler(index)}
              >
                <div className="font-bold">{prompt.name}</div>
                <div className="truncate text-sm opacity-80">
                  {prompt.content}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </>
  )
}
