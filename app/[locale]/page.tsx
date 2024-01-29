"use client"

import { ChatbotUISVG } from "@/components/icons/chatbotui-svg"
import { IconArrowRight } from "@tabler/icons-react"
import { useTheme } from "next-themes"
import Link from "next/link"

export default function HomePage() {
  const { theme } = useTheme()

  return (
    <div className="flex h-screen flex-col items-center justify-center">
      <ChatbotUISVG theme={theme === "dark" ? "dark" : "light"} scale={0.3} />
      <div className="mt-2 text-4xl font-bold">ChatGPT for YEEXUN</div>
      <Link
        className="mt-4 flex w-[200px] items-center justify-center rounded-md bg-blue-500 p-2 font-semibold"
        href="/chat"
      >
        开始聊天
        <IconArrowRight className="ml-1" size={20} />
      </Link>
    </div>
  )
}
