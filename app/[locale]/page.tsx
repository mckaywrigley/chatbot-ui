"use client"

import { ChatbotUISVG } from "@/components/icons/chatbotui-svg"
import { ThemeSwitcher } from "@/components/utility/theme-switcher"
import { exportLocalStorageAsJSON } from "@/lib/export"
import {
  IconBrandGithub,
  IconBrandX,
  IconFileDownload,
  IconStarFilled,
  IconVideo
} from "@tabler/icons-react"
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
    <div className="size-screen flex flex-col p-6">
      <div className="flex items-center justify-between">
        <div className="relative flex items-center space-x-4">
          <div className="absolute left-0 top-[-16px] md:top-[-2px]">
            <ChatbotUISVG
              theme={theme === "dark" ? "dark" : "light"}
              scale={0.25}
            />
          </div>

          <div className="hidden pl-11 text-3xl font-bold md:block">
            Chatbot UI
          </div>
        </div>

        <div className="flex items-center space-x-8">
          <div className="space-x-4 md:space-x-8 md:text-lg">
            <Link
              className="cursor-pointer hover:opacity-50"
              href="https://github.com/mckaywrigley/chatbot-ui"
              target="_blank"
              rel="noopener noreferrer"
            >
              About
            </Link>

            {/* <Link
              className="cursor-pointer hover:opacity-50"
              href="/updates"
            >
              Updates
            </Link>

            <Link
              className="cursor-pointer hover:opacity-50"
              href="/docs"
            >
              Docs
            </Link> */}

            <Link
              className="cursor-pointer hover:opacity-50"
              href="https://twitter.com/mckaywrigley"
              target="_blank"
              rel="noopener noreferrer"
            >
              Contact
            </Link>
          </div>

          <div className="flex space-x-4">
            <Link
              className="text-md border-primary bg-primary text-secondary flex h-[40px] w-[100px] cursor-pointer items-center justify-center rounded-lg border-2 p-2 font-semibold hover:opacity-50"
              href="https://x.com/mckaywrigley/status/1738273242283151777?s=20"
              target="_blank"
              rel="noopener noreferrer"
            >
              Demo
              <IconVideo className="ml-1" size={20} />
            </Link>

            {/* <Link
              className="text-md flex h-[40px] w-[90px] cursor-pointer items-center justify-center rounded-lg border-2 border-blue-500 bg-blue-500 p-2 font-semibold text-white hover:opacity-50"
              href="login"
            >
              Login
            </Link> */}
          </div>
        </div>
      </div>

      <div className="flex grow flex-col items-center justify-center pb-20">
        <div className="flex flex-col text-4xl font-semibold md:text-[56px]">
          <div>The</div>
          <div className="md:mt-4">open-source</div>
          <div className="mt-1.5 md:mt-7">AI chat app</div>
          <div className="mt-1 md:mt-6">for everyone.</div>
        </div>

        <div className="mt-5 flex flex-col items-center space-y-2 md:mt-10 md:flex-row md:space-x-4 md:space-y-0">
          <Link
            className="text-md border-primary bg-primary text-secondary flex cursor-pointer items-center rounded-lg border-2 p-2 font-semibold hover:opacity-50"
            href="https://github.com/mckaywrigley/chatbot-ui"
            target="_blank"
            rel="noopener noreferrer"
          >
            <IconStarFilled className="mb-[1px]" size={18} />

            <div className="ml-1.5">{stars.toLocaleString()} GitHub</div>
          </Link>

          {/* <Link
            className="text-md flex cursor-pointer items-center rounded-lg border-2 border-blue-500 bg-blue-500 p-2 font-semibold text-white hover:opacity-50"
            href="login"
          >
            Start Chatting
            <IconArrowRight
              className="ml-1"
              size={22}
            />
          </Link> */}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex min-w-[76px] items-center space-x-2">
          <ThemeSwitcher />

          <IconFileDownload
            className="cursor-pointer hover:opacity-50"
            size={32}
            onClick={exportLocalStorageAsJSON}
          />
        </div>

        <div className="text-center">
          Built by
          <Link
            className="ml-1 cursor-pointer hover:opacity-50"
            href="https://twitter.com/takeoffai"
            target="_blank"
            rel="noopener noreferrer"
          >
            Takeoff AI
          </Link>
        </div>

        <div className="flex space-x-3">
          <Link
            className="cursor-pointer hover:opacity-50"
            href="https://twitter.com/ChatbotUI"
            target="_blank"
            rel="noopener noreferrer"
          >
            <IconBrandX size={28} />
          </Link>

          <Link
            className="cursor-pointer hover:opacity-50"
            href="https://github.com/mckaywrigley/chatbot-ui"
            target="_blank"
            rel="noopener noreferrer"
          >
            <IconBrandGithub size={28} />
          </Link>
        </div>
      </div>
    </div>
  )
}
