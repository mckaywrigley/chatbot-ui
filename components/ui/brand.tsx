"use client"

import Link from "next/link"
import { FC } from "react"
import { ChatbotUISVG } from "../icons/chatbotui-svg"

interface BrandProps {
  theme?: "dark" | "light"
}

export const Brand: FC<BrandProps> = ({ theme = "dark" }) => {
  return (
    <>
      <div className="flex cursor-pointer flex-col items-center">
        <div className="mb-2">
          <ChatbotUISVG
            theme={theme === "dark" ? "dark" : "light"}
            scale={0.4}
          />
        </div>

        <div className="text-3xl font-bold tracking-wide">HackerGPT</div>
      </div>
    </>
  )
}

export const BrandSmall: FC<BrandProps> = ({ theme = "dark" }) => {
  return (
    <>
      <div className="flex cursor-pointer flex-col items-center">
        <div className="mb-2">
          <ChatbotUISVG
            theme={theme === "dark" ? "dark" : "light"}
            scale={0.25}
          />
        </div>
      </div>
    </>
  )
}
