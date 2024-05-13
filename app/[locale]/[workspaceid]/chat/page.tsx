"use client"

import { ChatHelp } from "@/components/chat/chat-help"
import { useChatHandler } from "@/components/chat/chat-hooks/use-chat-handler"
import { ChatInput } from "@/components/chat/chat-input"
import { ChatUI } from "@/components/chat/chat-ui"
import { Brand } from "@/components/ui/brand"
import { ChatbotUIContext } from "@/context/context"
import { updateProfile } from "@/db/profile"
import useHotkey from "@/lib/hooks/use-hotkey"
import { useTheme } from "next-themes"
import { useContext, useEffect, useRef } from "react"

export default function ChatPage() {
  useHotkey("o", () => handleNewChat())
  useHotkey("l", () => {
    handleFocusChatInput()
  })

  const { chatMessages, profile, setProfile } = useContext(ChatbotUIContext)

  const { handleNewChat, handleFocusChatInput, handleStartTutorial } =
    useChatHandler()

  const { theme } = useTheme()

  // Ref to track if the tutorial has been started to prevent duplicate executions
  const tutorialStartedRef = useRef(false)

  useEffect(() => {
    const startTutorial = async () => {
      if (profile && !profile.has_onboarded && !tutorialStartedRef.current) {
        console.log("Starting tutorial for the first time")
        tutorialStartedRef.current = true // Mark as tutorial started
        const updatedProfile = await updateProfile(profile.id, {
          ...profile,
          has_onboarded: true
        })
        setProfile(updatedProfile)
        handleStartTutorial()
      }
    }

    startTutorial()
  }, [profile])

  return (
    <>
      {chatMessages.length === 0 ? (
        <div className="relative flex h-full flex-col items-center justify-center">
          <div className="top-50% left-50% -translate-x-50% -translate-y-50% absolute mb-20">
            <Brand theme={theme === "dark" ? "dark" : "light"} />
            <div className="mx-16 mt-5 border-t-2 pt-5">
              <p>
                Create a new topic by describing it below and/or upload a file
                using the ⨁ button.
              </p>
            </div>
          </div>

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
