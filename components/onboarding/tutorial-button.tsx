"use client"

/**
 * Persistent "Tutorial" button (top-right) that replays the first-run
 * walkthrough - for anyone who skipped it or wants a refresher. Hidden while
 * the tour is running so it doesn't overlap the overlay. Mounted once in the
 * app layout alongside GuidedTour.
 */

import { useEffect, useState } from "react"
import { IconHelpCircle } from "@tabler/icons-react"

import { isWalkthroughActive, setWalkthroughActive } from "./design-coach"

export function TutorialButton() {
  const [tourOn, setTourOn] = useState(false)

  useEffect(() => {
    const sync = () => setTourOn(isWalkthroughActive())
    sync()
    const id = setInterval(sync, 1000)
    return () => clearInterval(id)
  }, [])

  if (tourOn) return null

  const replay = () => {
    try {
      localStorage.setItem("sa_tour_step", "0")
    } catch {
      /* ignore */
    }
    setWalkthroughActive(true)
  }

  return (
    <button
      type="button"
      onClick={replay}
      title="Replay the walkthrough"
      className="border-line bg-surface text-ink-2 hover:bg-paper-2 hover:text-ink fixed bottom-4 right-4 z-30 inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12px] font-medium shadow-sm transition-colors"
    >
      <IconHelpCircle size={14} />
      Tutorial
    </button>
  )
}
