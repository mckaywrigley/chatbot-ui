import { ChatbotUIContext } from "@/context/context"
import { Tables } from "@/supabase/types"
import { FC, useContext, useEffect, useRef, useState } from "react"
import { Button } from "../ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog"
import { Label } from "../ui/label"
import { TextareaAutosize } from "../ui/textarea-autosize"
import { usePromptAndCommand } from "./chat-hooks/use-prompt-and-command"

interface PromptPickerProps {}

export const PromptPicker: FC<PromptPickerProps> = ({}) => {
  const {
    prompts,
    isPromptPickerOpen,
    setIsPromptPickerOpen,
    focusPrompt,
    slashCommand
  } = useContext(ChatbotUIContext)

  const { handleSelectPrompt } = usePromptAndCommand()

  const itemsRef = useRef<(HTMLDivElement | null)[]>([])

  const [promptVariables, setPromptVariables] = useState<
    {
      promptId: string
      name: string
      value: string
    }[]
  >([])
  const [showPromptVariables, setShowPromptVariables] = useState(false)

  useEffect(() => {
    if (focusPrompt && itemsRef.current[0]) {
      itemsRef.current[0].focus()
    }
  }, [focusPrompt])

  const [isTyping, setIsTyping] = useState(false)

  const filteredPrompts = prompts.filter(prompt =>
    prompt.name.toLowerCase().includes(slashCommand.toLowerCase())
  )

  const handleOpenChange = (isOpen: boolean) => {
    setIsPromptPickerOpen(isOpen)
  }

  const callSelectPrompt = (prompt: Tables<"prompts">) => {
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
      handleSelectPrompt(prompt)
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
        callSelectPrompt(filteredPrompts[index])
      } else if (
        (e.key === "Tab" || e.key === "ArrowDown") &&
        !e.shiftKey &&
        index === filteredPrompts.length - 1
      ) {
        e.preventDefault()
        itemsRef.current[0]?.focus()
      } else if (e.key === "ArrowUp" && !e.shiftKey && index === 0) {
        // go to last element if arrow up is pressed on first element
        e.preventDefault()
        itemsRef.current[itemsRef.current.length - 1]?.focus()
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        const prevIndex =
          index - 1 >= 0 ? index - 1 : itemsRef.current.length - 1
        itemsRef.current[prevIndex]?.focus()
      } else if (e.key === "ArrowDown") {
        e.preventDefault()
        const nextIndex = index + 1 < itemsRef.current.length ? index + 1 : 0
        itemsRef.current[nextIndex]?.focus()
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

    handleSelectPrompt(newPrompt)
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
    if (!isTyping && e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmitPromptVariables()
    }
  }

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
                        onCompositionStart={() => setIsTyping(true)}
                        onCompositionEnd={() => setIsTyping(false)}
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
                ref={ref => {
                  itemsRef.current[index] = ref
                }}
                tabIndex={0}
                className="hover:bg-accent focus:bg-accent flex cursor-pointer flex-col rounded p-2 focus:outline-none"
                onClick={() => callSelectPrompt(prompt)}
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
