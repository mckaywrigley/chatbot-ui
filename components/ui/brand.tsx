"use client"

import Image from "next/image"
import { FC } from "react"

import { cn } from "@/lib/utils"

interface BrandProps {
  theme?: "dark" | "light"
  size?: number
  collapsed?: boolean
  className?: string
}

/**
 * Brand wordmark.
 *
 * Helix PNG (public/shadowai-logo.png, 3:4 portrait) sits on the left,
 * rendered inside a fixed-size square with `object-contain` so it
 * keeps its natural ratio at any `size`. To the right, the textual
 * "Shadow AI" lockup uses the logo's palette: "Shadow" in cyan
 * (#22D3EE) and "AI" as a cyan → magenta gradient that mirrors the
 * helix's hue sweep.
 */
export const Brand: FC<BrandProps> = ({
  size = 22,
  collapsed = false,
  className
}) => {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span
        className="relative inline-block shrink-0"
        style={{ width: size, height: size }}
        aria-hidden
      >
        <Image
          src="/shadowai-logo.png"
          alt=""
          fill
          sizes={`${size}px`}
          className="object-contain"
          priority
        />
      </span>
      {!collapsed && (
        <span
          className="pt-0.5 text-[22px] font-semibold leading-none tracking-[-0.02em]"
          style={{ fontSize: Math.max(16, size) }}
        >
          <span className="text-[#22D3EE]">Shadow</span>{" "}
          <span className="bg-[linear-gradient(90deg,#22D3EE_0%,#E879F9_100%)] bg-clip-text text-transparent">
            AI
          </span>
        </span>
      )}
    </div>
  )
}
