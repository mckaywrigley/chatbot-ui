"use client"

import Link from "next/link"
import { FC } from "react"
import { LearnTimeSVG } from "../icons/learntime"

interface BrandProps {
  theme?: "dark" | "light"
}

export const Brand: FC<BrandProps> = ({ theme = "dark" }) => {
  return (
    <Link
      className="flex cursor-pointer flex-col items-center hover:opacity-50"
      href="https://www.learntime.ai"
      target="_blank"
      rel="noopener noreferrer"
    >
      <div className="mb-2">
        <LearnTimeSVG theme={theme === "dark" ? "dark" : "light"} scale={0.3} />
      </div>

      <div className="text-4xl font-bold">LearnTime</div>
    </Link>
  )
}
