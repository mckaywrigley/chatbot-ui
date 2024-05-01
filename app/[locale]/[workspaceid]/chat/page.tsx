"use client"

import { ChatHelp } from "@/components/chat/chat-help"
import { useChatHandler } from "@/components/chat/chat-hooks/use-chat-handler"
import { ChatInput } from "@/components/chat/chat-input"
import { ChatSettings } from "@/components/chat/chat-settings"
import { ChatUI } from "@/components/chat/chat-ui"
import { QuickSettings } from "@/components/chat/quick-settings"
import { ChatBrand } from "@/components/ui/chat-brand"
import { ChatbotUIContext } from "@/context/context"
import useHotkey from "@/lib/hooks/use-hotkey"
import { useTheme } from "next-themes"
import { useContext } from "react"

export default function ChatPage() {
  useHotkey("o", () => handleNewChat())
  useHotkey("l", () => {
    handleFocusChatInput()
  })

  const { chatMessages } = useContext(ChatbotUIContext)

  const { handleNewChat, handleFocusChatInput } = useChatHandler()

  const { theme } = useTheme()

  return (
    <>
      {chatMessages.length === 0 ? (
        <div className="flex h-screen w-full flex-col">
          <div className="flex flex-row items-center justify-between">
            <div className="">
              <QuickSettings />
            </div>

            <div className="">
              <ChatSettings />
            </div>
          </div>

          <div className="top-50% left-50% -translate-x-50% -translate-y-50% mb-20">
            <ChatBrand theme={theme === "dark" ? "dark" : "light"} />
          </div>

          <div className="flex grow flex-col items-center justify-center" />

          <div className="flex w-full flex-row items-center justify-center">
            <div className="flex w-[300px] items-center justify-center pb-8 sm:w-[400px] md:w-[500px] lg:w-[660px] xl:w-[714px]">
              <ChatInput />
            </div>
          </div>

          <div className="absolute bottom-2 right-2 z-0 hidden md:block lg:bottom-4 lg:right-4">
            <ChatHelp />
          </div>
        </div>
      ) : (
        <ChatUI />
      )}
    </>
  )
}
