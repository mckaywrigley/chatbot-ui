"use client"

import Link from "next/link"
import { FC } from "react"
import { ChatbotUISVG } from "../icons/chatbotui-svg"

interface BrandProps {
  theme?: "dark" | "light"
}

export const Brand: FC<BrandProps> = ({ theme = "dark" }) => {
  return (
    <div className="flex cursor-pointer flex-col items-center">
      <div className="relative size-[100px]">
        <div className="absolute left-0 top-0 size-[100px] rounded-full bg-stone-900" />
        <div className="absolute left-[30px] top-[30px] size-10">
          <div className="bg-pixelspace-pink absolute left-0 top-0 size-[18.64px] rounded-full" />
          <div className="bg-pixelspace-pink absolute left-[21.36px] top-0 size-[18.64px] rounded-full" />
          <div className="bg-pixelspace-pink absolute left-0 top-[21.36px] size-[18.64px] rounded-full" />
          <div className="bg-pixelspace-pink absolute left-[21.36px] top-[21.36px] size-[18.64px] rounded-full" />
        </div>
      </div>
      <div className="mt-6 text-4xl font-bold tracking-wide">Pixelspace AI</div>
    </div>
  )
}
