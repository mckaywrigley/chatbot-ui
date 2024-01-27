"use client"

import { ChatbotUISVG } from "@/components/icons/chatbotui-svg"
import { IconArrowRight } from "@tabler/icons-react"
import Link from "next/link"

export default function HomePage({ theme = "dark" }) {
  return (
    <div className="flex size-full flex-col items-center justify-center">
      <div>
        <ChatbotUISVG
          theme={theme === "dark" ? "dark" : "light"}
          scale={0.45}
        />
      </div>

      <div className="mt-2 text-4xl font-bold">HackerGPT</div>

      <Link
        className="mt-4 flex w-[200px] items-center justify-center rounded-md bg-blue-500 p-2 font-semibold"
        href="/chat"
      >
        Start Chatting
        <IconArrowRight className="ml-1" size={20} />
      </Link>
    </div>
  )
}
