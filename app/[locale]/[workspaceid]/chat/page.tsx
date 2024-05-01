"use client"

import { ChatHelp } from "@/components/chat/chat-help"
import { useChatHandler } from "@/components/chat/chat-hooks/use-chat-handler"
import { ChatInput } from "@/components/chat/chat-input"
import { ChatUI } from "@/components/chat/chat-ui"
import { Brand } from "@/components/ui/brand"
import { Button } from "@/components/ui/button"
import { ChatbotUIContext } from "@/context/context"
import useHotkey from "@/lib/hooks/use-hotkey"
import { IconPlanet } from "@tabler/icons-react"
import { useTheme } from "next-themes"
import { useContext } from "react"

export default function ChatPage() {
  useHotkey("o", () => handleNewChat())
  useHotkey("l", () => {
    handleFocusChatInput()
  })

  const { chatMessages } = useContext(ChatbotUIContext)

  const { handleNewChat, handleFocusChatInput, handleStartTutorial } =
    useChatHandler()

  const { theme } = useTheme()

  return (
    <>
      {chatMessages.length === 0 ? (
        <div className="relative flex h-full flex-col items-center justify-center">
          <div className="top-50% left-50% -translate-x-50% -translate-y-50% absolute mb-20">
            <Brand theme={theme === "dark" ? "dark" : "light"} />
            <div className="mx-16 mt-5 border-t-2 pt-5">
              {localStorage.getItem("tutorialDone") === "true" ? (
                <>
                  <p>
                    Create a new topic by describing it below and/or upload a
                    file using the ⨁ button.
                  </p>
                  <div className="mt-3 border-t-2 pt-5">
                    <p className="text-grey-600/75 dark:text-grey-400/50">
                      🪐
                      <a
                        href="#"
                        onClick={handleStartTutorial}
                        className="pl-1 underline"
                      >
                        Restart tutorial
                      </a>
                      .
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <p>
                    Welcome! Let&apos;s get started by creating a new tutorial
                    topic:
                  </p>
                  <div className="mt-3 flex items-center justify-center">
                    <p>
                      <a
                        href="#"
                        onClick={handleStartTutorial}
                        className="flex"
                      >
                        <IconPlanet className="mr-1" />
                        <span>Start tutorial</span>
                      </a>
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* <div className="absolute left-2 top-2">
            <QuickSettings />
          </div>

          <div className="absolute right-2 top-2">
            <ChatSettings />
          </div> */}

          <div className="flex grow flex-col items-center justify-center" />

          <div className="w-full min-w-[300px] items-end px-2 pb-3 pt-0 sm:w-[600px] sm:pb-8 sm:pt-5 md:w-[700px] lg:w-[700px] xl:w-[800px]">
            <ChatInput />
          </div>

          <div className="absolute bottom-2 right-2 hidden md:block lg:bottom-4 lg:right-4">
            <ChatHelp />
          </div>
        </div>
      ) : (
        <ChatUI />
      )}
    </>
  )
}
