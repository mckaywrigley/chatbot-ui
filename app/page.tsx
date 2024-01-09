"use client"

import { ChatbotUISVG } from "@/components/icons/chatbotui-svg"
import { IconArrowRight } from "@tabler/icons-react"
import { useTheme } from "next-themes"
import Link from "next/link"
import { useEffect, useState } from "react"

export default function HomePage() {
  const { theme } = useTheme()

  const [stars, setStars] = useState(19000)

  useEffect(() => {
    getGitHubRepoStars()
  }, [])

  const getGitHubRepoStars = async () => {
    const url = `https://api.github.com/repos/mckaywrigley/chatbot-ui`

    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/vnd.github.v3+json"
        }
      })

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`)
      }

      const data = await response.json()
      setStars(data.stargazers_count)
    } catch (error) {
      console.error("Failed to fetch GitHub stars:", error)
      return 0
    }
  }

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center">
      <div>
        <ChatbotUISVG theme={theme === "dark" ? "dark" : "light"} scale={0.3} />
      </div>

      <div className="mt-2 text-4xl font-bold">Chatbot UI</div>

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
