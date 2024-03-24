"use client"

import { ChatHelp } from "@/components/chat/chat-help"
import { useChatHandler } from "@/components/chat/chat-hooks/use-chat-handler"
import { ChatInput } from "@/components/chat/chat-input"
import { ChatSettings } from "@/components/chat/chat-settings"
import { ChatUI } from "@/components/chat/chat-ui"
import { QuickSettings } from "@/components/chat/quick-settings"
import { Brand } from "@/components/ui/brand"
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
        <div className="relative flex h-full flex-col items-center justify-center">
          <div className="top-50% left-50% -translate-x-50% -translate-y-50% absolute mb-20">
            <div className="relative bg-white px-6 pb-8 pt-10 shadow-xl ring-1 ring-gray-900/5 sm:mx-auto sm:max-w-lg sm:rounded-lg sm:px-10">
              <div className="mx-auto max-w-md">
                <Brand theme={theme === "dark" ? "dark" : "light"} />
                <div className="divide-y divide-gray-300/50">
                  <div className="space-y-6 py-8 text-base leading-7 text-gray-600">
                    <p>Create a new topic to get started:</p>
                    <ul className="space-y-4">
                      <li className="flex items-center">
                        <svg
                          className="size-6 flex-none fill-sky-100 stroke-sky-500 stroke-2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        >
                          <circle cx="12" cy="12" r="11" />
                          <path
                            d="m8 13 2.165 2.165a1 1 0 0 0 1.521-.126L16 9"
                            fill="none"
                          />
                        </svg>
                        <p className="ml-4">Type the name of new topic.</p>
                      </li>
                      <li className="flex items-center">
                        <svg
                          className="size-6 flex-none fill-sky-100 stroke-sky-500 stroke-2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        >
                          <circle cx="12" cy="12" r="11" />
                          <path
                            d="m8 13 2.165 2.165a1 1 0 0 0 1.521-.126L16 9"
                            fill="none"
                          />
                        </svg>
                        <p className="ml-4">
                          Upload ⊕ or select file(s) #️⃣ containing the topic
                          material.
                        </p>
                      </li>
                      <li className="flex items-center">
                        <svg
                          className="size-6 flex-none fill-sky-100 stroke-sky-500 stroke-2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        >
                          <circle cx="12" cy="12" r="11" />
                          <path
                            d="m8 13 2.165 2.165a1 1 0 0 0 1.521-.126L16 9"
                            fill="none"
                          />
                        </svg>
                        <p className="ml-4">Or describe after title below.</p>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute left-2 top-2">
            <QuickSettings />
          </div>

          <div className="absolute right-2 top-2">
            <ChatSettings />
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
