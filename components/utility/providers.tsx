"use client"

import { TooltipProvider } from "@/components/ui/tooltip"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { ThemeProviderProps } from "next-themes/dist/types"
import { FC } from "react"
import { GlobalState } from "./global-state"

export const Providers: FC<ThemeProviderProps> = ({ children, ...props }) => {
  return (
    <GlobalState>
      <NextThemesProvider {...props}>
        <TooltipProvider>{children}</TooltipProvider>
      </NextThemesProvider>
    </GlobalState>
  )
}
