"use client"

import { ChatbotUISVG } from "@/components/icons/chatbotui-svg"
import { LoginBrand } from "@/components/ui/login-brand"
import { IconArrowRight } from "@tabler/icons-react"
import { useTheme } from "next-themes"
import Link from "next/link"

export default function HomePage() {
  const { theme } = useTheme()

  return (
    <div className="bg-pixelspace-gray-90 flex h-[calc(100dvh)] w-full flex-col items-center justify-center space-y-[40px]">
      <LoginBrand />

      <Link
        className="text-pixelspace-gray-90 bg-pixelspace-gray-10 mt-4  flex w-[200px] items-center justify-center rounded-sm p-2 font-bold"
        href="/login"
      >
        Start Chatting
        <IconArrowRight className="ml-1" size={20} />
      </Link>
    </div>
  )
}
