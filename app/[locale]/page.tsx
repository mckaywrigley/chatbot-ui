"use client"

import { LearntimeSVG } from "@/components/icons/learntime"
import { IconArrowRight } from "@tabler/icons-react"
import { useTheme } from "next-themes"
import Link from "next/link"

export default function HomePage() {
  const { theme } = useTheme()
  return (
    <div className="flex size-full flex-col items-center justify-center">
      <div className="flex justify-center">
        <div className="mr-2 flex-none">
          <LearntimeSVG
            theme={theme === "dark" ? "dark" : "light"}
            scale={0.07}
          />
        </div>

        <div className="flex-1 text-4xl font-bold italic">Learntime</div>
      </div>

      <Link
        className="mt-4 flex w-[230px] items-center justify-center rounded-md bg-blue-500 p-2 font-semibold"
        href="/login"
      >
        Start Learning
        <IconArrowRight className="ml-1" size={20} />
      </Link>
    </div>
  )
}
