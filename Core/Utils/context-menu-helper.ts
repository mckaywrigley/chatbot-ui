import { CONTEXT_MENU_THRESHOLD_PERCENTAGE } from "@/config"

export interface Position {
  x: number
  y: number
}

export const shouldRenderMenuOnTop = (cursorPosition: Position): boolean => {
  const viewportHeight = window.innerHeight

  const clickPositionPercentage = (cursorPosition.y / viewportHeight) * 100

  return clickPositionPercentage > CONTEXT_MENU_THRESHOLD_PERCENTAGE
}
