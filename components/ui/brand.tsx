"use client"

import Link from "next/link"
import { FC } from "react"
import { LearntimeSVG } from "../icons/learntime"

interface BrandProps {
  theme?: "dark" | "light"
}

export const Brand: FC<BrandProps> = ({ theme = "dark" }) => {
  return (
    <div className="flex justify-center">
      <Link
        className="flex cursor-pointer items-center hover:opacity-50"
        href="https://www.learntime.ai"
        target="_blank"
        rel="noopener noreferrer"
      >
        <div className="mr-2 flex-none">
          <LearntimeSVG
            theme={theme === "dark" ? "dark" : "light"}
            scale={0.07}
          />
        </div>

        <div className="flex-1 text-4xl font-bold italic">Learntime</div>
      </Link>
    </div>
  )
}
