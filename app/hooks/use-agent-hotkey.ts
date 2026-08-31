import { useEffect } from "react"

/**
 * Binds ⌘/Ctrl + I to a toggle callback. Pages that render an agent drawer
 * call this with their open/close toggler.
 */
export function useAgentHotkey(onToggle: () => void) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "i") {
        e.preventDefault()
        onToggle()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onToggle])
}
