"use client"

import Link from "next/link"
import { FC } from "react"

interface BrandProps {
  theme?: "dark" | "light"
}

export const Brand: FC<BrandProps> = ({ theme = "dark" }) => {
  return (
      <div className="text-4xl font-bold tracking-wide">Ultimate AI</div>
  )
}
