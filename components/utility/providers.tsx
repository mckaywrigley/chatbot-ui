"use client"

import { TooltipProvider } from "@/components/ui/tooltip"
import { AlertProvider } from "@/context/alert-context"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { ThemeProviderProps } from "next-themes/dist/types"
import { FC } from "react"

export const Providers: FC<ThemeProviderProps> = ({ children, ...props }) => {
  return (
    <NextThemesProvider {...props}>
      <AlertProvider>
        <TooltipProvider>{children}</TooltipProvider>
      </AlertProvider>
    </NextThemesProvider>
  )
}
