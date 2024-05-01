"use client"

import { TooltipProvider } from "@/components/ui/tooltip"
import { SideMenuProvider } from "@/context/side-menu-context"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { ThemeProviderProps } from "next-themes/dist/types"
import { FC } from "react"

export const Providers: FC<ThemeProviderProps> = ({ children, ...props }) => {
  return (
    <NextThemesProvider {...props}>
      <TooltipProvider>
        <SideMenuProvider>{children}</SideMenuProvider>
      </TooltipProvider>
    </NextThemesProvider>
  )
}
